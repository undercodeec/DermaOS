import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { audit } from "../lib/audit.js";
import { badRequest, notFound } from "../lib/errors.js";
import { encryptSecret } from "../lib/secret-box.js";

const router = Router();
router.use(requireAuth, requireRole("admin"));

function serializePayphoneProvider(p: Awaited<ReturnType<typeof prisma.clinicPaymentProvider.findFirst>>) {
  if (!p) {
    return {
      configured: false,
      provider: "payphone",
      mode: "manual",
      ruc: "",
      storeId: "",
      status: "missing",
      hasToken: false,
      lastVerifiedAt: null,
      updatedAt: null,
    };
  }
  return {
    configured: true,
    provider: p.provider,
    mode: p.mode,
    ruc: p.ruc ?? "",
    storeId: p.storeId,
    status: p.status,
    hasToken: true,
    lastVerifiedAt: p.lastVerifiedAt?.toISOString() ?? null,
    updatedAt: p.updatedAt.toISOString(),
  };
}

router.get("/payphone", async (req, res, next) => {
  try {
    const provider = await prisma.clinicPaymentProvider.findFirst({
      where: { clinicId: req.user!.clinicId, provider: "payphone" },
    });
    res.json(serializePayphoneProvider(provider));
  } catch (e) {
    next(e);
  }
});

const payphoneSchema = z.object({
  ruc: z.string().trim().optional().nullable(),
  storeId: z.string().trim().min(1),
  token: z.string().trim().min(1).optional(),
  status: z.enum(["active", "disabled"]).default("active"),
});

router.put("/payphone", async (req, res, next) => {
  try {
    const b = payphoneSchema.parse(req.body);
    const cur = await prisma.clinicPaymentProvider.findFirst({
      where: { clinicId: req.user!.clinicId, provider: "payphone" },
    });
    if (!cur && !b.token) {
      throw badRequest("Token Payphone requerido para la primera configuracion");
    }
    const data = {
      ruc: b.ruc || null,
      storeId: b.storeId,
      status: b.status,
      mode: "manual",
    };
    const provider = cur
      ? await prisma.clinicPaymentProvider.update({
          where: { id: cur.id },
          data: {
            ...data,
            ...(b.token ? { tokenEncrypted: encryptSecret(b.token) } : {}),
          },
        })
      : await prisma.clinicPaymentProvider.create({
          data: {
            clinicId: req.user!.clinicId,
            provider: "payphone",
            tokenEncrypted: encryptSecret(b.token!),
            ...data,
          },
        });
    await audit(req, "Actualizo credenciales Payphone", "sistema", `storeId ${provider.storeId}`);
    res.json(serializePayphoneProvider(provider));
  } catch (e) {
    next(e);
  }
});

router.get("/users", async (req, res, next) => {
  try {
    const list = await prisma.user.findMany({
      where: { clinicId: req.user!.clinicId },
      orderBy: [{ active: "desc" }, { fullName: "asc" }],
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        active: true,
        mfaEnabled: true,
        professionalId: true,
        lastAccess: true,
        createdAt: true,
      },
    });
    res.json(
      list.map((u) => ({
        ...u,
        lastAccess: u.lastAccess?.toISOString() ?? null,
        createdAt: u.createdAt.toISOString(),
      })),
    );
  } catch (e) {
    next(e);
  }
});

const patchUserSchema = z.object({
  active: z.boolean().optional(),
  mfaEnabled: z.boolean().optional(),
  role: z.enum(["admin", "recepcion", "profesional", "esteticista", "contador"]).optional(),
});

router.patch("/users/:id", async (req, res, next) => {
  try {
    const cur = await prisma.user.findFirst({
      where: { id: req.params.id, clinicId: req.user!.clinicId },
    });
    if (!cur) throw notFound("Usuario no encontrado");
    const b = patchUserSchema.parse(req.body);
    const u = await prisma.user.update({
      where: { id: cur.id },
      data: {
        active: b.active ?? cur.active,
        mfaEnabled: b.mfaEnabled ?? cur.mfaEnabled,
        role: b.role ?? cur.role,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        active: true,
        mfaEnabled: true,
        professionalId: true,
        lastAccess: true,
        createdAt: true,
      },
    });

    const changes: string[] = [];
    if (b.active !== undefined && b.active !== cur.active) changes.push(b.active ? "activado" : "desactivado");
    if (b.mfaEnabled !== undefined && b.mfaEnabled !== cur.mfaEnabled) changes.push(`MFA ${b.mfaEnabled ? "activado" : "desactivado"}`);
    if (b.role && b.role !== cur.role) changes.push(`rol → ${b.role}`);
    if (changes.length) {
      await audit(req, "Modificó permisos de usuario", "sistema", `${cur.fullName} · ${changes.join(", ")}`);
    }

    res.json({
      ...u,
      lastAccess: u.lastAccess?.toISOString() ?? null,
      createdAt: u.createdAt.toISOString(),
    });
  } catch (e) {
    next(e);
  }
});

router.post("/users/:id/mfa/reset", async (req, res, next) => {
  try {
    const cur = await prisma.user.findFirst({
      where: { id: req.params.id, clinicId: req.user!.clinicId },
    });
    if (!cur) throw notFound("Usuario no encontrado");
    await prisma.user.update({ where: { id: cur.id }, data: { mfaSecret: null } });
    await audit(req, "Reseteó MFA de usuario", "sistema", cur.fullName);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

router.get("/audit-logs", async (req, res, next) => {
  try {
    const { cat, from, to, take } = req.query as Record<string, string>;
    const where: Record<string, unknown> = { clinicId: req.user!.clinicId };
    if (cat) where.cat = cat;
    if (from || to) {
      const range: Record<string, Date> = {};
      if (from) range.gte = new Date(from);
      if (to) range.lte = new Date(to);
      where.at = range;
    }
    const list = await prisma.auditLog.findMany({
      where,
      include: { user: { select: { fullName: true, role: true } } },
      orderBy: { at: "desc" },
      take: Math.min(Number(take ?? 200), 500),
    });
    res.json(
      list.map((l) => ({
        id: l.id,
        userId: l.userId,
        action: l.action,
        cat: l.cat,
        label: l.label,
        at: l.at.toISOString(),
        ip: l.ip,
        user: l.user,
      })),
    );
  } catch (e) {
    next(e);
  }
});

export default router;
