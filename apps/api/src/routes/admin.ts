import bcrypt from "bcryptjs";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth, requireModule, requireRole } from "../middleware/auth.js";
import { audit } from "../lib/audit.js";
import { badRequest, conflict, notFound } from "../lib/errors.js";
import { encryptSecret } from "../lib/secret-box.js";

const router = Router();
router.use(requireAuth, requireRole("admin"));
router.use(requireModule("sistema"));

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

const createUserSchema = z.object({
  fullName: z.string().trim().min(2),
  email: z.string().trim().email(),
  password: z.string().min(8),
  role: z.enum(["admin", "recepcion", "profesional", "esteticista", "contador"]),
  active: z.boolean().default(true),
  mfaEnabled: z.boolean().default(false),
  professionalId: z.string().uuid().optional().nullable(),
});

router.post("/users", async (req, res, next) => {
  try {
    const b = createUserSchema.parse(req.body);
    const email = b.email.toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw conflict("El correo ya esta registrado");

    if (b.professionalId) {
      const professional = await prisma.professional.findFirst({
        where: { id: b.professionalId, clinicId: req.user!.clinicId },
        select: { id: true },
      });
      if (!professional) throw badRequest("Profesional no valido para esta clinica");
    }

    const passwordHash = await bcrypt.hash(b.password, 12);
    const user = await prisma.user.create({
      data: {
        clinicId: req.user!.clinicId,
        fullName: b.fullName,
        email,
        passwordHash,
        role: b.role,
        active: b.active,
        mfaEnabled: b.mfaEnabled,
        professionalId: b.professionalId || null,
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

    await audit(req, "Creo usuario", "sistema", `${user.fullName} · ${user.role}`);
    res.status(201).json({
      ...user,
      lastAccess: user.lastAccess?.toISOString() ?? null,
      createdAt: user.createdAt.toISOString(),
    });
  } catch (e) {
    next(e);
  }
});

const patchUserSchema = z.object({
  fullName: z.string().trim().min(2).optional(),
  email: z.string().trim().email().optional(),
  password: z.string().min(8).optional(),
  active: z.boolean().optional(),
  mfaEnabled: z.boolean().optional(),
  role: z.enum(["admin", "recepcion", "profesional", "esteticista", "contador"]).optional(),
  professionalId: z.string().uuid().optional().nullable(),
});

router.patch("/users/:id", async (req, res, next) => {
  try {
    const cur = await prisma.user.findFirst({
      where: { id: req.params.id, clinicId: req.user!.clinicId },
    });
    if (!cur) throw notFound("Usuario no encontrado");
    const b = patchUserSchema.parse(req.body);

    const removesActiveAdmin = cur.role === "admin"
      && cur.active
      && ((b.role !== undefined && b.role !== "admin") || b.active === false);
    if (removesActiveAdmin) {
      const activeAdmins = await prisma.user.count({
        where: { clinicId: req.user!.clinicId, role: "admin", active: true },
      });
      if (activeAdmins <= 1) throw conflict("La clinica debe conservar al menos un administrador activo");
    }

    const email = b.email?.toLowerCase();
    if (email && email !== cur.email) {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) throw conflict("El correo ya esta registrado");
    }

    if (b.professionalId) {
      const professional = await prisma.professional.findFirst({
        where: { id: b.professionalId, clinicId: req.user!.clinicId },
        select: { id: true },
      });
      if (!professional) throw badRequest("Profesional no valido para esta clinica");
    }

    const passwordHash = b.password ? await bcrypt.hash(b.password, 12) : undefined;
    const u = await prisma.user.update({
      where: { id: cur.id },
      data: {
        fullName: b.fullName ?? cur.fullName,
        email: email ?? cur.email,
        ...(passwordHash ? { passwordHash } : {}),
        active: b.active ?? cur.active,
        mfaEnabled: b.mfaEnabled ?? cur.mfaEnabled,
        role: b.role ?? cur.role,
        professionalId: b.professionalId !== undefined ? b.professionalId || null : cur.professionalId,
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
    if (b.fullName && b.fullName !== cur.fullName) changes.push("nombre actualizado");
    if (email && email !== cur.email) changes.push("email actualizado");
    if (passwordHash) changes.push("contrasena actualizada");
    if (b.active !== undefined && b.active !== cur.active) changes.push(b.active ? "activado" : "desactivado");
    if (b.mfaEnabled !== undefined && b.mfaEnabled !== cur.mfaEnabled) changes.push(`MFA ${b.mfaEnabled ? "activado" : "desactivado"}`);
    if (b.role && b.role !== cur.role) changes.push(`rol → ${b.role}`);
    if (b.professionalId !== undefined && b.professionalId !== cur.professionalId) changes.push("profesional actualizado");
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
