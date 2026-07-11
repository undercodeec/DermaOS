import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth, requireModule } from "../middleware/auth.js";
import { audit } from "../lib/audit.js";
import { badRequest, notFound } from "../lib/errors.js";

const router = Router();
router.use(requireAuth, requireModule("pagos"));

const CONCEPTS = ["libre", "deposito", "paquete", "factura"] as const;
const STATUSES = ["pendiente", "pagado", "anulado"] as const;
const SENT_VIA = ["whatsapp", "email"] as const;

function serialize(p: Awaited<ReturnType<typeof prisma.payment.findFirstOrThrow>> & {
  patient?: { firstName: string; lastName: string; idNumber: string; phone: string | null } | null;
}) {
  return {
    id: p.id,
    patientId: p.patientId,
    conceptType: p.conceptType,
    conceptRefId: p.conceptRefId,
    conceptLabel: p.conceptLabel,
    amount: String(p.amount),
    method: p.method,
    status: p.status,
    payphoneLink: p.payphoneLink,
    txId: p.txId,
    sentVia: p.sentVia,
    createdAt: p.createdAt.toISOString(),
    paidAt: p.paidAt?.toISOString() ?? null,
    note: p.note,
    patient: p.patient
      ? {
          firstName: p.patient.firstName,
          lastName: p.patient.lastName,
          idNumber: p.patient.idNumber,
          phone: p.patient.phone,
        }
      : null,
  };
}

function genPayphone() {
  const abc = "abcdefghijkmnpqrstuvwxyz23456789";
  const token = Array.from({ length: 6 }, () => abc[Math.floor(Math.random() * abc.length)]).join("");
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return {
    link: `https://ppls.me/${token}`,
    txId: `PP-${stamp}${String(Math.floor(Math.random() * 90) + 10)}`,
  };
}

router.get("/", async (req, res, next) => {
  try {
    const { patientId, status } = req.query as Record<string, string>;
    const where: Record<string, unknown> = { clinicId: req.user!.clinicId };
    if (patientId) where.patientId = patientId;
    if (status) where.status = status;
    const list = await prisma.payment.findMany({
      where,
      include: {
        patient: { select: { firstName: true, lastName: true, idNumber: true, phone: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(list.map(serialize));
  } catch (e) {
    next(e);
  }
});

const createSchema = z.object({
  patientId: z.string().uuid(),
  conceptType: z.enum(CONCEPTS),
  conceptRefId: z.string().uuid().nullable().optional(),
  conceptLabel: z.string().min(1),
  amount: z.number().positive(),
  note: z.string().optional(),
});

router.post("/", requireModule("pagos", "write"), async (req, res, next) => {
  try {
    const b = createSchema.parse(req.body);
    const { link, txId } = genPayphone();
    const created = await prisma.payment.create({
      data: {
        clinicId: req.user!.clinicId,
        patientId: b.patientId,
        conceptType: b.conceptType,
        conceptRefId: b.conceptRefId ?? null,
        conceptLabel: b.conceptLabel,
        amount: b.amount,
        method: "payphone",
        status: "pendiente",
        payphoneLink: link,
        txId,
        note: b.note ?? null,
      },
      include: {
        patient: { select: { firstName: true, lastName: true, idNumber: true, phone: true } },
      },
    });
    await audit(
      req,
      "Generó link de cobro Payphone",
      "pagos",
      `$${b.amount.toFixed(2)} · ${created.patient?.firstName ?? ""} ${created.patient?.lastName ?? ""}`.trim(),
    );
    res.status(201).json(serialize(created));
  } catch (e) {
    next(e);
  }
});

const sentSchema = z.object({ via: z.enum(SENT_VIA) });
router.patch("/:id/sent", requireModule("pagos", "write"), async (req, res, next) => {
  try {
    const cur = await prisma.payment.findFirst({
      where: { id: req.params.id, clinicId: req.user!.clinicId },
    });
    if (!cur) throw notFound("Cobro no encontrado");
    if (cur.status !== "pendiente") throw badRequest("Solo se envían cobros pendientes");
    const { via } = sentSchema.parse(req.body);
    const updated = await prisma.payment.update({
      where: { id: cur.id },
      data: { sentVia: via },
      include: {
        patient: { select: { firstName: true, lastName: true, idNumber: true, phone: true } },
      },
    });
    await audit(
      req,
      "Envió link de cobro",
      "pagos",
      via === "email" ? "por correo electrónico" : "por WhatsApp",
    );
    res.json(serialize(updated));
  } catch (e) {
    next(e);
  }
});

router.patch("/:id/paid", requireModule("pagos", "write"), async (req, res, next) => {
  try {
    const cur = await prisma.payment.findFirst({
      where: { id: req.params.id, clinicId: req.user!.clinicId },
      include: {
        patient: { select: { firstName: true, lastName: true, idNumber: true, phone: true } },
      },
    });
    if (!cur) throw notFound("Cobro no encontrado");
    if (cur.status !== "pendiente") throw badRequest("El cobro ya no está pendiente");

    const updated = await prisma.payment.update({
      where: { id: cur.id },
      data: { status: "pagado", paidAt: new Date() },
      include: {
        patient: { select: { firstName: true, lastName: true, idNumber: true, phone: true } },
      },
    });

    await audit(
      req,
      "Concilió cobro Payphone",
      "pagos",
      `$${Number(cur.amount).toFixed(2)} · ${cur.patient?.firstName ?? ""} ${cur.patient?.lastName ?? ""}`.trim(),
    );

    // Conciliación automática: si es cobro de paquete, registrar abono
    if (cur.conceptType === "paquete" && cur.conceptRefId) {
      const bal = await prisma.packageBalance.findUnique({
        where: { id: cur.conceptRefId },
        include: { package: true, patient: true },
      });
      if (bal) {
        await prisma.packagePayment.create({
          data: {
            balanceId: bal.id,
            amount: cur.amount,
            method: "payphone",
            note: "Pago Payphone conciliado",
          },
        });
        await audit(
          req,
          "Registró abono de paquete",
          "paquetes",
          `${bal.package.name} · $${Number(cur.amount).toFixed(2)} · ${bal.patient.firstName} ${bal.patient.lastName}`,
        );
      }
    }

    res.json(serialize(updated));
  } catch (e) {
    next(e);
  }
});

router.patch("/:id/void", requireModule("pagos", "write"), async (req, res, next) => {
  try {
    const cur = await prisma.payment.findFirst({
      where: { id: req.params.id, clinicId: req.user!.clinicId },
    });
    if (!cur) throw notFound("Cobro no encontrado");
    if (cur.status !== "pendiente") throw badRequest("Solo se anulan cobros pendientes");
    const updated = await prisma.payment.update({
      where: { id: cur.id },
      data: { status: "anulado" },
      include: {
        patient: { select: { firstName: true, lastName: true, idNumber: true, phone: true } },
      },
    });
    await audit(req, "Anuló link de cobro", "pagos", "");
    res.json(serialize(updated));
  } catch (e) {
    next(e);
  }
});

export default router;
