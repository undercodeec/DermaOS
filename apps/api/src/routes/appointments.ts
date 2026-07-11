import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth, requireModule } from "../middleware/auth.js";
import { audit } from "../lib/audit.js";
import { badRequest, notFound } from "../lib/errors.js";

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
    if (professionalId) where.professionalId = professionalId;
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
    const start = new Date(b.startAt);
    const end = b.endAt
      ? new Date(b.endAt)
      : new Date(start.getTime() + svc.durationMin * 60_000);
    if (end <= start) throw badRequest("Hora de fin inválida");

    const created = await prisma.appointment.create({
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

    if (start > new Date()) {
      const pat = await prisma.patient.findUnique({
        where: { id: b.patientId },
        select: { nextAppointment: true },
      });
      if (!pat?.nextAppointment || start < pat.nextAppointment) {
        await prisma.patient.update({
          where: { id: b.patientId },
          data: { nextAppointment: start },
        });
      }
    }

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

async function consumeForAppointment(apptId: string, patientId: string, serviceId: string, professionalId: string) {
  const already = await prisma.packageRedemption.findFirst({ where: { appointmentId: apptId } });
  if (already) return null;
  const bal = await prisma.packageBalance.findFirst({
    where: {
      patientId,
      status: "activo",
      vencimiento: { gt: new Date() },
      package: { serviceId },
    },
    orderBy: { soldAt: "asc" },
    include: { package: true },
  });
  if (!bal || bal.sessionsUsed >= bal.sessionsTotal) return null;
  const used = bal.sessionsUsed + 1;
  const [, redemption] = await prisma.$transaction([
    prisma.packageBalance.update({
      where: { id: bal.id },
      data: {
        sessionsUsed: used,
        status: used >= bal.sessionsTotal ? "completado" : bal.status,
      },
    }),
    prisma.packageRedemption.create({
      data: {
        balanceId: bal.id,
        appointmentId: apptId,
        professionalId,
        note: "Sesión descontada al atender la cita",
      },
    }),
  ]);
  return { balance: bal, redemption };
}

router.patch("/:id", requireModule("agenda", "write"), async (req, res, next) => {
  try {
    const cur = await prisma.appointment.findFirst({
      where: { id: req.params.id, clinicId: req.user!.clinicId },
    });
    if (!cur) throw notFound("Cita no encontrada");
    const b = patchSchema.parse(req.body);

    const data: Record<string, unknown> = {};
    if (b.status) data.status = b.status;
    if (b.notes !== undefined) data.notes = b.notes;
    if (b.professionalId) data.professionalId = b.professionalId;
    if (b.startAt) data.startAt = new Date(b.startAt);
    if (b.endAt) data.endAt = new Date(b.endAt);

    const updated = await prisma.appointment.update({
      where: { id: cur.id },
      data,
      include: {
        patient: { select: { firstName: true, lastName: true, idNumber: true } },
        service: { select: { name: true, price: true, durationMin: true } },
        professional: { select: { name: true, color: true } },
      },
    });

    if (b.status && b.status !== cur.status) {
      await audit(
        req,
        `Cambió cita → ${b.status}`,
        "agenda",
        `${updated.patient?.firstName ?? ""} ${updated.patient?.lastName ?? ""}`.trim(),
      );
      if (b.status === "atendida" && cur.status !== "atendida") {
        await consumeForAppointment(cur.id, cur.patientId, cur.serviceId, cur.professionalId);
      }
    }

    res.json(serialize(updated));
  } catch (e) {
    next(e);
  }
});

router.delete("/:id", requireModule("agenda", "write"), async (req, res, next) => {
  try {
    const cur = await prisma.appointment.findFirst({
      where: { id: req.params.id, clinicId: req.user!.clinicId },
      include: { patient: { select: { firstName: true, lastName: true } } },
    });
    if (!cur) throw notFound("Cita no encontrada");
    await prisma.appointment.delete({ where: { id: cur.id } });
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
      where: { id: req.params.id, clinicId: req.user!.clinicId },
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
