import { Router } from "express";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "../db.js";
import { requireAuth, requireModule } from "../middleware/auth.js";
import { audit } from "../lib/audit.js";
import { badRequest, notFound } from "../lib/errors.js";
import { createPayphoneLink, newClientTransactionId } from "../lib/payphone.js";
import { decryptSecret } from "../lib/secret-box.js";

const router = Router();

const CONCEPTS = ["libre", "deposito", "paquete", "factura"] as const;
const STATUSES = ["pendiente", "pagado", "anulado"] as const;
const SENT_VIA = ["whatsapp", "email"] as const;

const payphoneNotificationSchema = z.object({
  Amount: z.number().int().nonnegative(),
  ClientTransactionId: z.string().min(1),
  StoreId: z.string().min(1),
  StatusCode: z.number().int().optional(),
  TransactionStatus: z.string().optional(),
  TransactionId: z.union([z.string(), z.number()]).optional(),
  AuthorizationCode: z.string().optional(),
}).passthrough();

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
    clientTransactionId: p.clientTransactionId,
    payphoneStoreId: p.payphoneStoreId,
    payphoneTransactionId: p.payphoneTransactionId,
    providerStatus: p.providerStatus,
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

router.post("/payphone/NotificacionPago", async (req, res) => {
  try {
    const b = payphoneNotificationSchema.parse(req.body);
    const provider = await prisma.clinicPaymentProvider.findFirst({
      where: { provider: "payphone", storeId: b.StoreId, status: "active" },
    });
    if (!provider) return res.json({ Response: false, ErrorCode: "666" });

    const payment = await prisma.payment.findFirst({
      where: {
        clinicId: provider.clinicId,
        payphoneStoreId: b.StoreId,
        clientTransactionId: b.ClientTransactionId,
      },
    });
    if (!payment) return res.json({ Response: false, ErrorCode: "222" });

    const approved = b.StatusCode === 3 || b.TransactionStatus?.toLowerCase() === "approved";
    if (!approved) return res.json({ Response: true, ErrorCode: "000" });

    const expected = Math.round(Number(payment.amount) * 100);
    if (expected !== b.Amount) return res.json({ Response: false, ErrorCode: "444" });

    if (payment.status !== "pagado") {
      await prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: "pagado",
            paidAt: new Date(),
            payphoneTransactionId: b.TransactionId ? String(b.TransactionId) : null,
            providerStatus: "approved",
            providerPayload: JSON.parse(JSON.stringify(b)) as Prisma.InputJsonObject,
          },
        });
        if (payment.conceptType === "paquete" && payment.conceptRefId) {
          await tx.packagePayment.create({
            data: {
              balanceId: payment.conceptRefId,
              amount: payment.amount,
              method: "payphone",
              note: "Pago Payphone notificado automaticamente",
            },
          });
        }
        await tx.auditLog.create({
          data: {
            clinicId: provider.clinicId,
            userId: null,
            action: "Conciliacion automatica Payphone",
            cat: "pagos",
            label: `${payment.clientTransactionId ?? payment.id} · $${Number(payment.amount).toFixed(2)}`,
          },
        });
      });
    }

    return res.json({ Response: true, ErrorCode: "000" });
  } catch {
    return res.json({ Response: false, ErrorCode: "111" });
  }
});

router.use(requireAuth, requireModule("pagos"));

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
    const pat = await prisma.patient.findFirst({ where: { id: b.patientId, clinicId: req.user!.clinicId } });
    if (!pat) throw badRequest("Paciente no encontrado");
    if (b.conceptType === "paquete" && b.conceptRefId) {
      const bal = await prisma.packageBalance.findFirst({ where: { id: b.conceptRefId, clinicId: req.user!.clinicId } });
      if (!bal) throw badRequest("Bono no encontrado");
    }
    const provider = await prisma.clinicPaymentProvider.findFirst({
      where: { clinicId: req.user!.clinicId, provider: "payphone", status: "active" },
    });
    if (!provider) {
      throw badRequest("Configura Payphone en Sistema antes de generar cobros");
    }
    const clientTransactionId = newClientTransactionId();
    const payphone = await createPayphoneLink(
      { token: decryptSecret(provider.tokenEncrypted), storeId: provider.storeId },
      {
        amount: b.amount,
        reference: b.conceptLabel,
        clientTransactionId,
        additionalData: `${b.conceptType}${b.conceptRefId ? `:${b.conceptRefId}` : ""}`,
      },
    );
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
        payphoneLink: payphone.link,
        txId: clientTransactionId,
        clientTransactionId,
        payphoneStoreId: provider.storeId,
        providerStatus: "link_created",
        providerPayload: payphone.payload,
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
