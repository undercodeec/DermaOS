import { Router } from "express";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "../db.js";
import { env } from "../env.js";
import { requirePlatformKey } from "../middleware/platformKey.js";
import { badRequest, notFound } from "../lib/errors.js";
import {
  ALL_MODULES,
  addDays,
  addMonths,
  daysLeft,
  effectiveStatus,
  ensureSubscription,
} from "../lib/entitlements.js";
import { createPayphoneLink, newClientTransactionId } from "../lib/payphone.js";

const router = Router();
const MAX_TRIAL_DAYS = 30;
const MAX_SUBSCRIPTION_MONTHS = 24;
const MAX_SUBSCRIPTION_AMOUNT = 10000;

const notificationSchema = z.object({
  Amount: z.number().int().nonnegative(),
  ClientTransactionId: z.string().min(1),
  StoreId: z.string().min(1),
  StatusCode: z.number().int().optional(),
  TransactionStatus: z.string().optional(),
  TransactionId: z.union([z.string(), z.number()]).optional(),
}).passthrough();

router.post("/payphone/NotificacionPago", async (req, res) => {
  try {
    const b = notificationSchema.parse(req.body);
    if (!env.PLATFORM_PAYPHONE_STORE_ID || b.StoreId !== env.PLATFORM_PAYPHONE_STORE_ID) {
      return res.json({ Response: false, ErrorCode: "666" });
    }
    const pay = await prisma.platformSubscriptionPayment.findFirst({
      where: { payphoneStoreId: b.StoreId, clientTransactionId: b.ClientTransactionId },
    });
    if (!pay) return res.json({ Response: false, ErrorCode: "222" });
    const approved = b.StatusCode === 3 || b.TransactionStatus?.toLowerCase() === "approved";
    if (!approved) return res.json({ Response: true, ErrorCode: "000" });
    if (Math.round(Number(pay.amount) * 100) !== b.Amount) {
      return res.json({ Response: false, ErrorCode: "444" });
    }

    if (pay.status === "pagado") return res.json({ Response: true, ErrorCode: "000" });
    if (pay.status !== "pendiente") return res.json({ Response: true, ErrorCode: "000" });

    await prisma.$transaction(async (tx) => {
      const now = new Date();
      const claimed = await tx.platformSubscriptionPayment.updateMany({
        where: { id: pay.id, status: "pendiente" },
        data: {
          status: "pagado",
          paidAt: now,
          payphoneTransactionId: b.TransactionId ? String(b.TransactionId) : null,
          providerPayload: JSON.parse(JSON.stringify(b)) as Prisma.InputJsonObject,
        },
      });
      if (claimed.count !== 1) return;

      const sub = await tx.clinicSubscription.findUnique({ where: { clinicId: pay.clinicId } });
      const base = sub?.subscriptionEndsAt && sub.subscriptionEndsAt > now ? sub.subscriptionEndsAt : now;
      await tx.clinicSubscription.upsert({
        where: { clinicId: pay.clinicId },
        update: {
          status: "active",
          verifiedAt: now,
          subscriptionEndsAt: addMonths(base, pay.months),
        },
        create: {
          clinicId: pay.clinicId,
          status: "active",
          verifiedAt: now,
          subscriptionEndsAt: addMonths(now, pay.months),
          allowedModules: ALL_MODULES,
        },
      });
      await tx.auditLog.create({
        data: {
          clinicId: pay.clinicId,
          userId: null,
          action: "Suscripcion activada por pago Payphone",
          cat: "sistema",
          label: `${pay.months} mes(es) - $${Number(pay.amount).toFixed(2)}`,
        },
      });
    });
    return res.json({ Response: true, ErrorCode: "000" });
  } catch {
    return res.json({ Response: false, ErrorCode: "111" });
  }
});

router.use(requirePlatformKey);

type ClinicWithAccess = NonNullable<Awaited<ReturnType<typeof prisma.clinic.findUnique>>> & {
  subscription?: {
    status: string;
    trialEndsAt: Date | null;
    subscriptionEndsAt: Date | null;
    allowedModules: string[];
    verifiedAt: Date | null;
    notes: string | null;
  } | null;
  users?: { id: string; fullName: string; email: string; active: boolean; role: string }[];
};

function serializeClinic(c: ClinicWithAccess) {
  const now = new Date();
  const status = effectiveStatus(c.subscription ?? null, now);
  const endsAt = status === "trialing" ? c.subscription?.trialEndsAt : c.subscription?.subscriptionEndsAt;
  return {
    id: c.id,
    name: c.name,
    ruc: c.ruc,
    active: c.active,
    createdAt: c.createdAt.toISOString(),
    status,
    rawStatus: c.subscription?.status ?? "pending_verification",
    verifiedAt: c.subscription?.verifiedAt?.toISOString() ?? null,
    trialEndsAt: c.subscription?.trialEndsAt?.toISOString() ?? null,
    subscriptionEndsAt: c.subscription?.subscriptionEndsAt?.toISOString() ?? null,
    daysLeft: daysLeft(endsAt, now),
    allowedModules: c.subscription?.allowedModules ?? [],
    notes: c.subscription?.notes ?? "",
    admins: (c.users ?? []).filter((u) => u.role === "admin"),
  };
}

router.get("/clinics", async (_req, res, next) => {
  try {
    const list = await prisma.clinic.findMany({
      include: {
        subscription: true,
        users: { select: { id: true, fullName: true, email: true, active: true, role: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(list.map((c) => serializeClinic(c)));
  } catch (e) {
    next(e);
  }
});

const moduleSchema = z.array(z.enum(ALL_MODULES as [string, ...string[]]));

router.patch("/clinics/:id/access", async (req, res, next) => {
  try {
    const body = z.object({
      allowedModules: moduleSchema.optional(),
      status: z.enum(["pending_verification", "trialing", "active", "expired", "suspended"]).optional(),
      notes: z.string().optional().nullable(),
      active: z.boolean().optional(),
    }).parse(req.body);
    const clinic = await prisma.clinic.findUnique({ where: { id: req.params.id } });
    if (!clinic) throw notFound("Clinica no encontrada");
    if (body.active !== undefined) {
      await prisma.clinic.update({ where: { id: clinic.id }, data: { active: body.active } });
    }
    await prisma.clinicSubscription.upsert({
      where: { clinicId: clinic.id },
      update: {
        ...(body.allowedModules ? { allowedModules: body.allowedModules } : {}),
        ...(body.status ? { status: body.status } : {}),
        ...(body.notes !== undefined ? { notes: body.notes } : {}),
      },
      create: {
        clinicId: clinic.id,
        status: body.status ?? "pending_verification",
        allowedModules: body.allowedModules ?? ALL_MODULES,
        notes: body.notes ?? null,
      },
    });
    const fresh = await prisma.clinic.findUnique({
      where: { id: clinic.id },
      include: {
        subscription: true,
        users: { select: { id: true, fullName: true, email: true, active: true, role: true } },
      },
    });
    res.json(serializeClinic(fresh!));
  } catch (e) {
    next(e);
  }
});

router.post("/clinics/:id/trial", async (req, res, next) => {
  try {
    const body = z.object({
      days: z.number().int().positive().max(MAX_TRIAL_DAYS).default(7),
      allowedModules: moduleSchema.optional(),
    }).parse(req.body);
    const clinic = await prisma.clinic.findUnique({ where: { id: req.params.id } });
    if (!clinic) throw notFound("Clinica no encontrada");
    const now = new Date();
    await prisma.clinicSubscription.upsert({
      where: { clinicId: clinic.id },
      update: {
        status: "trialing",
        verifiedAt: now,
        trialStartedAt: now,
        trialEndsAt: addDays(now, body.days),
        allowedModules: body.allowedModules ?? ALL_MODULES,
      },
      create: {
        clinicId: clinic.id,
        status: "trialing",
        verifiedAt: now,
        trialStartedAt: now,
        trialEndsAt: addDays(now, body.days),
        allowedModules: body.allowedModules ?? ALL_MODULES,
      },
    });
    const fresh = await prisma.clinic.findUnique({
      where: { id: clinic.id },
      include: {
        subscription: true,
        users: { select: { id: true, fullName: true, email: true, active: true, role: true } },
      },
    });
    res.json(serializeClinic(fresh!));
  } catch (e) {
    next(e);
  }
});

router.post("/clinics/:id/extend", async (req, res, next) => {
  try {
    const body = z.object({ months: z.number().int().positive().max(MAX_SUBSCRIPTION_MONTHS).default(1) }).parse(req.body);
    const clinic = await prisma.clinic.findUnique({ where: { id: req.params.id }, include: { subscription: true } });
    if (!clinic) throw notFound("Clinica no encontrada");
    const now = new Date();
    const base = clinic.subscription?.subscriptionEndsAt && clinic.subscription.subscriptionEndsAt > now
      ? clinic.subscription.subscriptionEndsAt
      : now;
    await prisma.clinicSubscription.upsert({
      where: { clinicId: clinic.id },
      update: { status: "active", verifiedAt: now, subscriptionEndsAt: addMonths(base, body.months) },
      create: {
        clinicId: clinic.id,
        status: "active",
        verifiedAt: now,
        subscriptionEndsAt: addMonths(now, body.months),
        allowedModules: ALL_MODULES,
      },
    });
    const fresh = await prisma.clinic.findUnique({
      where: { id: clinic.id },
      include: {
        subscription: true,
        users: { select: { id: true, fullName: true, email: true, active: true, role: true } },
      },
    });
    res.json(serializeClinic(fresh!));
  } catch (e) {
    next(e);
  }
});

router.post("/clinics/:id/payment-link", async (req, res, next) => {
  try {
    const body = z.object({
      months: z.number().int().positive().max(MAX_SUBSCRIPTION_MONTHS).default(1),
      amount: z.number().positive().max(MAX_SUBSCRIPTION_AMOUNT).default(env.PLATFORM_SUBSCRIPTION_MONTHLY_AMOUNT),
    }).parse(req.body);
    if (!env.PLATFORM_PAYPHONE_TOKEN || !env.PLATFORM_PAYPHONE_STORE_ID) {
      throw badRequest("Configura PLATFORM_PAYPHONE_TOKEN y PLATFORM_PAYPHONE_STORE_ID");
    }
    const clinic = await prisma.clinic.findUnique({ where: { id: req.params.id } });
    if (!clinic) throw notFound("Clinica no encontrada");
    await ensureSubscription(clinic.id);
    const clientTransactionId = newClientTransactionId();
    const created = await prisma.platformSubscriptionPayment.create({
      data: {
        clinicId: clinic.id,
        amount: body.amount,
        months: body.months,
        status: "pendiente",
        clientTransactionId,
        payphoneStoreId: env.PLATFORM_PAYPHONE_STORE_ID,
        note: `Suscripcion DERMA-OS ${body.months} mes(es)`,
      },
    });
    const payphone = await createPayphoneLink(
      { token: env.PLATFORM_PAYPHONE_TOKEN, storeId: env.PLATFORM_PAYPHONE_STORE_ID },
      {
        amount: body.amount,
        reference: `DERMA-OS suscripcion - ${clinic.name}`,
        clientTransactionId,
        additionalData: `platform-subscription:${clinic.id}:${created.id}`,
      },
    );
    const updated = await prisma.platformSubscriptionPayment.update({
      where: { id: created.id },
      data: { payphoneLink: payphone.link, providerPayload: payphone.payload },
    });
    res.status(201).json({
      id: updated.id,
      link: updated.payphoneLink,
      amount: String(updated.amount),
      months: updated.months,
      clientTransactionId: updated.clientTransactionId,
    });
  } catch (e) {
    next(e);
  }
});

export default router;
