import { Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../db.js";
import { requireAuth, requireModule } from "../middleware/auth.js";
import { audit } from "../lib/audit.js";
import { badRequest, forbidden, notFound } from "../lib/errors.js";
import { acquireTransactionLock } from "../lib/db-locks.js";

const router = Router();
router.use(requireAuth, requireModule("agenda"));

const APPT_KINDS = ["consulta_nueva", "control", "procedimiento"] as const;
const APPT_STATUSES = [
  "agendada",
  "confirmada",
  "en_sala",
  "atendida",
  "no_show",
  "cancelada",
] as const;

const TERMINAL_STATUSES = new Set(["atendida", "no_show", "cancelada"]);
const ALLOWED_STATUS_TRANSITIONS: Record<(typeof APPT_STATUSES)[number], ReadonlySet<(typeof APPT_STATUSES)[number]>> = {
  agendada: new Set(["confirmada", "en_sala", "atendida", "no_show", "cancelada"]),
  confirmada: new Set(["en_sala", "atendida", "no_show", "cancelada"]),
  en_sala: new Set(["atendida", "cancelada"]),
  atendida: new Set(),
  no_show: new Set(),
  cancelada: new Set(),
};

function scopedProfessionalId(req: Express.Request) {
  if (req.user!.role !== "profesional" && req.user!.role !== "esteticista") return null;
  if (!req.user!.professionalId) throw forbidden("El usuario no tiene un profesional asociado");
  return req.user!.professionalId;
}

function assertProfessionalScope(req: Express.Request, professionalId: string) {
  const ownProfessionalId = scopedProfessionalId(req);
  if (ownProfessionalId && ownProfessionalId !== professionalId) {
    throw forbidden("Solo puedes operar sobre tu propia agenda");
  }
}

async function refreshNextAppointment(tx: Prisma.TransactionClient, patientId: string) {
  const next = await tx.appointment.findFirst({
    where: {
      patientId,
      startAt: { gt: new Date() },
      status: { in: ["agendada", "confirmada", "en_sala"] },
    },
    orderBy: { startAt: "asc" },
    select: { startAt: true },
  });
  await tx.patient.update({
    where: { id: patientId },
    data: { nextAppointment: next?.startAt ?? null },
  });
}

async function ensureNoProfessionalOverlap(
  tx: Prisma.TransactionClient,
  input: { clinicId: string; professionalId: string; startAt: Date; endAt: Date; excludeId?: string },
) {
  await acquireTransactionLock(tx, `appointment:${input.professionalId}`);
  const overlap = await tx.appointment.findFirst({
    where: {
      clinicId: input.clinicId,
      professionalId: input.professionalId,
      status: { notIn: ["cancelada", "no_show"] },
      startAt: { lt: input.endAt },
      endAt: { gt: input.startAt },
      ...(input.excludeId ? { id: { not: input.excludeId } } : {}),
    },
    select: { id: true },
  });
  if (overlap) throw badRequest("El profesional ya tiene una cita en ese horario");
}

function serialize(a: Awaited<ReturnType<typeof prisma.appointment.findFirstOrThrow>> & {
  patient?: { firstName: string; lastName: string; idNumber: string } | null;
  service?: { name: string; price: unknown; durationMin: number } | null;
  professional?: { name: string; color: string } | null;
}) {
  return {
    id: a.id,
    patientId: a.patientId,
    serviceId: a.serviceId,
    professionalId: a.professionalId,
    startAt: a.startAt.toISOString(),
    endAt: a.endAt.toISOString(),
    kind: a.kind,
    status: a.status,
    notes: a.notes,
    patient: a.patient
      ? {
          firstName: a.patient.firstName,
          lastName: a.patient.lastName,
          idNumber: a.patient.idNumber,
        }
      : null,
    service: a.service
      ? {
          name: a.service.name,
          price: String(a.service.price ?? "0"),
          durationMin: a.service.durationMin,
        }
      : null,
    professional: a.professional
      ? { name: a.professional.name, color: a.professional.color }
      : null,
  };
}

// GET /appointments?from=ISO&to=ISO&professionalId=uuid
router.get("/", async (req, res, next) => {
  try {
    const { from, to, professionalId } = req.query as Record<string, string>;
    const where: Record<string, unknown> = { clinicId: req.user!.clinicId };
    if (from || to) {
      const range: Record<string, Date> = {};
      if (from) range.gte = new Date(from);
      if (to) range.lte = new Date(to);
      where.startAt = range;
    }
    const ownProfessionalId = scopedProfessionalId(req);
    if (ownProfessionalId) where.professionalId = ownProfessionalId;
    else if (professionalId) where.professionalId = professionalId;
    const list = await prisma.appointment.findMany({
      where,
      include: {
        patient: { select: { firstName: true, lastName: true, idNumber: true } },
        service: { select: { name: true, price: true, durationMin: true } },
        professional: { select: { name: true, color: true } },
      },
      orderBy: { startAt: "asc" },
    });
    res.json(list.map(serialize));
  } catch (e) {
    next(e);
  }
});

const createSchema = z.object({
  patientId: z.string().uuid(),
  serviceId: z.string().uuid(),
  professionalId: z.string().uuid(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime().optional(),
  kind: z.enum(APPT_KINDS),
  notes: z.string().optional().nullable(),
});

router.post("/", requireModule("agenda", "write"), async (req, res, next) => {
  try {
    const b = createSchema.parse(req.body);
    const [svc, pat, prof] = await Promise.all([
      prisma.service.findFirst({ where: { id: b.serviceId, clinicId: req.user!.clinicId } }),
      prisma.patient.findFirst({ where: { id: b.patientId, clinicId: req.user!.clinicId } }),
      prisma.professional.findFirst({ where: { id: b.professionalId, clinicId: req.user!.clinicId } }),
    ]);
    if (!svc) throw notFound("Servicio no encontrado");
    if (!pat) throw notFound("Paciente no encontrado");
    if (!prof) throw notFound("Profesional no encontrado");
    assertProfessionalScope(req, prof.id);
    const start = new Date(b.startAt);
    const end = b.endAt
      ? new Date(b.endAt)
      : new Date(start.getTime() + svc.durationMin * 60_000);
    if (end <= start) throw badRequest("Hora de fin inválida");

    const created = await prisma.$transaction(async (tx) => {
      await ensureNoProfessionalOverlap(tx, {
        clinicId: req.user!.clinicId,
        professionalId: b.professionalId,
        startAt: start,
        endAt: end,
      });
      const item = await tx.appointment.create({
        data: {
          clinicId: req.user!.clinicId,
          patientId: b.patientId,
          serviceId: b.serviceId,
          professionalId: b.professionalId,
          startAt: start,
          endAt: end,
          kind: b.kind,
          status: "agendada",
          notes: b.notes ?? null,
        },
        include: {
          patient: { select: { firstName: true, lastName: true, idNumber: true } },
          service: { select: { name: true, price: true, durationMin: true } },
          professional: { select: { name: true, color: true } },
        },
      });
      await refreshNextAppointment(tx, b.patientId);
      return item;
    });

    await audit(
      req,
      "Agendó cita",
      "agenda",
      `${created.patient?.firstName ?? ""} ${created.patient?.lastName ?? ""}`.trim(),
    );
    res.status(201).json(serialize(created));
  } catch (e) {
    next(e);
  }
});

const patchSchema = z.object({
  status: z.enum(APPT_STATUSES).optional(),
  notes: z.string().nullable().optional(),
  startAt: z.string().datetime().optional(),
  endAt: z.string().datetime().optional(),
  professionalId: z.string().uuid().optional(),
});

async function ensureProfessionalForClinic(professionalId: string, clinicId: string) {
  const professional = await prisma.professional.findFirst({
    where: { id: professionalId, clinicId },
    select: { id: true },
  });
  if (!professional) throw notFound("Profesional no encontrado");
  return professional;
}

async function consumeForAppointment(
  tx: Prisma.TransactionClient,
  apptId: string,
  patientId: string,
  serviceId: string,
  professionalId: string,
  clinicId: string,
) {
  const already = await tx.packageRedemption.findUnique({ where: { appointmentId: apptId } });
  if (already) return null;
  const bal = await tx.packageBalance.findFirst({
    where: {
      patientId,
      clinicId,
      status: "activo",
      vencimiento: { gt: new Date() },
      package: { serviceId },
    },
    orderBy: { soldAt: "asc" },
    include: { package: true },
  });
  if (!bal || bal.sessionsUsed >= bal.sessionsTotal) return null;
  const used = bal.sessionsUsed + 1;
  const claimed = await tx.packageBalance.updateMany({
    where: { id: bal.id, status: "activo", sessionsUsed: bal.sessionsUsed },
    data: {
      sessionsUsed: { increment: 1 },
      status: used >= bal.sessionsTotal ? "completado" : bal.status,
    },
  });
  if (claimed.count !== 1) throw new Error("CONCURRENT_PACKAGE_CONSUMPTION");
  const redemption = await tx.packageRedemption.create({
    data: {
      balanceId: bal.id,
      appointmentId: apptId,
      professionalId,
      note: "Sesión descontada al atender la cita",
    },
  });
  return { balance: bal, redemption };
}

router.patch("/:id", requireModule("agenda", "write"), async (req, res, next) => {
  try {
    const cur = await prisma.appointment.findFirst({
      where: {
        id: req.params.id,
        clinicId: req.user!.clinicId,
        ...(scopedProfessionalId(req) ? { professionalId: scopedProfessionalId(req)! } : {}),
      },
    });
    if (!cur) throw notFound("Cita no encontrada");
    const b = patchSchema.parse(req.body);
    if (TERMINAL_STATUSES.has(cur.status)) {
      throw badRequest(`Una cita ${cur.status} es historica y no se modifica; registra una correccion separada`);
    }
    if (b.status && b.status !== cur.status && !ALLOWED_STATUS_TRANSITIONS[cur.status].has(b.status)) {
      throw badRequest(`Transicion de cita no permitida: ${cur.status} → ${b.status}`);
    }

    const data: Record<string, unknown> = {};
    if (b.status) data.status = b.status;
    if (b.notes !== undefined) data.notes = b.notes;
    if (b.professionalId) {
      await ensureProfessionalForClinic(b.professionalId, req.user!.clinicId);
      assertProfessionalScope(req, b.professionalId);
      data.professionalId = b.professionalId;
    }
    if (b.startAt) data.startAt = new Date(b.startAt);
    if (b.endAt) data.endAt = new Date(b.endAt);
    const resultingStart = b.startAt ? new Date(b.startAt) : cur.startAt;
    const resultingEnd = b.endAt ? new Date(b.endAt) : cur.endAt;
    if (resultingEnd <= resultingStart) throw badRequest("Hora de fin inválida");

    let updated: Awaited<ReturnType<typeof prisma.appointment.findFirstOrThrow>> & {
      patient: { firstName: string; lastName: string; idNumber: string };
      service: { name: string; price: unknown; durationMin: number };
      professional: { name: string; color: string };
    };
    for (let attempt = 0; ; attempt += 1) {
      try {
        updated = await prisma.$transaction(async (tx) => {
          const resultingStatus = b.status ?? cur.status;
          if (resultingStatus !== "cancelada" && resultingStatus !== "no_show") {
            await ensureNoProfessionalOverlap(tx, {
              clinicId: req.user!.clinicId,
              professionalId: b.professionalId ?? cur.professionalId,
              startAt: resultingStart,
              endAt: resultingEnd,
              excludeId: cur.id,
            });
          }
          const item = await tx.appointment.update({
            where: { id: cur.id },
            data,
            include: {
              patient: { select: { firstName: true, lastName: true, idNumber: true } },
              service: { select: { name: true, price: true, durationMin: true } },
              professional: { select: { name: true, color: true } },
            },
          });
          if (b.status === "atendida" && cur.status !== "atendida") {
            await consumeForAppointment(
              tx,
              item.id,
              item.patientId,
              item.serviceId,
              item.professionalId,
              req.user!.clinicId,
            );
          }
          if (b.startAt || b.status) await refreshNextAppointment(tx, item.patientId);
          return item;
        });
        break;
      } catch (error) {
        if (error instanceof Error && error.message === "CONCURRENT_PACKAGE_CONSUMPTION" && attempt < 2) continue;
        throw error;
      }
    }

    if (b.status && b.status !== cur.status) {
      await audit(
        req,
        `Cambió cita → ${b.status}`,
        "agenda",
        `${updated.patient?.firstName ?? ""} ${updated.patient?.lastName ?? ""}`.trim(),
      );
    }

    res.json(serialize(updated));
  } catch (e) {
    next(e);
  }
});

router.delete("/:id", requireModule("agenda", "write"), async (req, res, next) => {
  try {
    const cur = await prisma.appointment.findFirst({
      where: {
        id: req.params.id,
        clinicId: req.user!.clinicId,
        ...(scopedProfessionalId(req) ? { professionalId: scopedProfessionalId(req)! } : {}),
      },
      include: { patient: { select: { firstName: true, lastName: true } } },
    });
    if (!cur) throw notFound("Cita no encontrada");
    if (cur.status !== "agendada") {
      throw badRequest("Solo se elimina una cita aun no procesada; para conservar trazabilidad usa cancelacion o no-show");
    }
    await prisma.$transaction(async (tx) => {
      await tx.appointment.delete({ where: { id: cur.id } });
      await refreshNextAppointment(tx, cur.patientId);
    });
    await audit(
      req,
      "Eliminó cita",
      "agenda",
      `${cur.patient?.firstName ?? ""} ${cur.patient?.lastName ?? ""}`.trim(),
    );
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

// Cobertura de paquete (preview en CitaDetalleModal)
router.get("/:id/coverage", async (req, res, next) => {
  try {
    const a = await prisma.appointment.findFirst({
      where: {
        id: req.params.id,
        clinicId: req.user!.clinicId,
        ...(scopedProfessionalId(req) ? { professionalId: scopedProfessionalId(req)! } : {}),
      },
    });
    if (!a) throw notFound("Cita no encontrada");

    const consumed = await prisma.packageRedemption.findFirst({
      where: { appointmentId: a.id },
      include: { balance: { include: { package: { select: { name: true } } } } },
    });
    if (consumed) {
      return res.json({
        consumed: true,
        balanceId: consumed.balanceId,
        packageName: consumed.balance.package.name,
        sessionsTotal: consumed.balance.sessionsTotal,
        sessionsUsed: consumed.balance.sessionsUsed,
      });
    }

    const cover = await prisma.packageBalance.findFirst({
      where: {
        patientId: a.patientId,
        clinicId: req.user!.clinicId,
        status: "activo",
        vencimiento: { gt: new Date() },
        package: { serviceId: a.serviceId },
      },
      include: { package: { select: { name: true } } },
      orderBy: { soldAt: "asc" },
    });
    if (!cover || cover.sessionsUsed >= cover.sessionsTotal) {
      return res.json({ consumed: false, cover: null });
    }
    res.json({
      consumed: false,
      cover: {
        balanceId: cover.id,
        packageName: cover.package.name,
        sessionsTotal: cover.sessionsTotal,
        sessionsLeft: cover.sessionsTotal - cover.sessionsUsed,
      },
    });
  } catch (e) {
    next(e);
  }
});

export default router;
