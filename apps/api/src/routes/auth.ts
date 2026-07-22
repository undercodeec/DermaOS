import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../db.js";
import { env } from "../env.js";
import { signToken } from "../lib/jwt.js";
import { requireAuth } from "../middleware/auth.js";
import { ipAndEmailKey, rateLimit } from "../middleware/rateLimit.js";
import { badRequest, unauthorized } from "../lib/errors.js";
import { appendAuditLog, recordAudit } from "../lib/audit.js";
import {
  generateLoginEmailCode,
  hashLoginEmailCode,
  isProductionAuthVerificationEnabled,
  sendLoginEmailCode,
  sendPasswordResetEmailCode,
} from "../lib/login-email.js";

const router = Router();
const loginLimit = rateLimit({ windowMs: 15 * 60_000, max: 10, key: ipAndEmailKey });
const passwordResetRequestLimit = rateLimit({ windowMs: 15 * 60_000, max: 3, key: ipAndEmailKey });
const passwordResetConfirmLimit = rateLimit({ windowMs: 15 * 60_000, max: 5, key: ipAndEmailKey });

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  emailCode: z.string().regex(/^\d{6}$/).optional(),
});
const passwordResetRequestSchema = z.object({ email: z.string().email() });
const passwordResetConfirmSchema = z.object({
  email: z.string().email(),
  code: z.string().regex(/^\d{6}$/),
  password: z.string().min(8, "La contrasena debe tener al menos 8 caracteres").max(128),
});

function buildLoginResponse(user: UserRow) {
  const token = signToken({
    sub: user.id,
    email: user.email,
    role: user.role,
    clinicId: user.clinicId,
    authVersion: user.authVersion,
  });
  return { token, profile: serialize(user) };
}

function readEmailCodeState(hash: string | null, expiresAt: Date | null, legacyRaw: string | null) {
  if (hash && expiresAt) return { hash, expiresAt };
  if (!legacyRaw) return null;
  try {
    const parsed = JSON.parse(legacyRaw) as { kind?: string; hash?: string; expiresAt?: string };
    if (parsed.kind !== "email-code" || !parsed.hash || !parsed.expiresAt) return null;
    const expiresAt = new Date(parsed.expiresAt);
    if (Number.isNaN(expiresAt.getTime())) return null;
    return { hash: parsed.hash, expiresAt };
  } catch {
    return null;
  }
}

async function completeLogin(user: UserRow, ip: string | null) {
  const hasLegacyEmailCode = Boolean(readEmailCodeState(null, null, user.mfaSecret));
  await prisma.user.update({
    where: { id: user.id },
    data: {
      lastAccess: new Date(),
      emailCodeHash: null,
      emailCodeExpiresAt: null,
      ...(hasLegacyEmailCode ? { mfaSecret: null } : {}),
    },
  });
  await recordAudit({
    clinicId: user.clinicId,
    userId: user.id,
    action: "Inicio de sesion",
    cat: "sesion",
    label: user.mfaEnabled && isProductionAuthVerificationEnabled()
      ? "Codigo por email verificado"
      : "Sesion iniciada",
    ip,
  });
  return buildLoginResponse(user);
}

async function issueEmailCode(user: UserRow, ip: string | null) {
  const code = generateLoginEmailCode();
  const expiresAt = new Date(Date.now() + env.AUTH_EMAIL_CODE_TTL_MINUTES * 60 * 1000);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailCodeHash: hashLoginEmailCode(user.id, code),
      emailCodeExpiresAt: expiresAt,
    },
  });
  await sendLoginEmailCode(user.email, code);
  await recordAudit({
    clinicId: user.clinicId,
    userId: user.id,
    action: "Envio codigo de acceso por email",
    cat: "sesion",
    label: user.email,
    ip,
  });
  return {
    emailVerificationRequired: true,
    emailMasked: maskEmail(user.email),
  };
}

function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  const head = local.slice(0, 2);
  const maskedLocal = `${head}${"*".repeat(Math.max(local.length - head.length, 1))}`;
  return `${maskedLocal}@${domain}`;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function hashPasswordResetCode(userId: string, code: string) {
  return hashLoginEmailCode(`password-reset:${userId}`, code);
}

router.post("/password-reset/request", passwordResetRequestLimit, async (req, res, next) => {
  try {
    const { email: rawEmail } = passwordResetRequestSchema.parse(req.body);
    const email = normalizeEmail(rawEmail);
    const user = await prisma.user.findUnique({ where: { email } });
    // Never disclose whether an email is registered.
    if (!user || !user.active) return res.json({ ok: true });

    const code = generateLoginEmailCode();
    const expiresAt = new Date(Date.now() + env.AUTH_EMAIL_CODE_TTL_MINUTES * 60 * 1000);
    await prisma.$transaction([
      prisma.passwordResetCode.updateMany({ where: { userId: user.id, usedAt: null }, data: { usedAt: new Date() } }),
      prisma.passwordResetCode.create({ data: { userId: user.id, codeHash: hashPasswordResetCode(user.id, code), expiresAt } }),
    ]);
    await sendPasswordResetEmailCode(user.email, code);
    await recordAudit({
      clinicId: user.clinicId,
      userId: user.id,
      action: "Solicitud de recuperacion de contrasena",
      cat: "sesion",
      ip: req.ip ?? null,
    });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

router.post("/password-reset/confirm", passwordResetConfirmLimit, async (req, res, next) => {
  try {
    const body = passwordResetConfirmSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: normalizeEmail(body.email) } });
    if (!user || !user.active) throw badRequest("El codigo es invalido o expiro");

    const reset = await prisma.passwordResetCode.findFirst({
      where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    });
    if (!reset || hashPasswordResetCode(user.id, body.code) !== reset.codeHash) {
      throw badRequest("El codigo es invalido o expiro");
    }

    const passwordHash = await bcrypt.hash(body.password, 12);
    await prisma.$transaction(async (tx) => {
      const usedAt = new Date();
      const claimed = await tx.passwordResetCode.updateMany({
        where: { id: reset.id, userId: user.id, usedAt: null, expiresAt: { gt: usedAt } },
        data: { usedAt },
      });
      if (claimed.count !== 1) throw badRequest("El codigo es invalido o ya fue utilizado");
      await tx.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          emailCodeHash: null,
          emailCodeExpiresAt: null,
          ...(readEmailCodeState(null, null, user.mfaSecret) ? { mfaSecret: null } : {}),
          authVersion: { increment: 1 },
        },
      });
      await tx.passwordResetCode.updateMany({
        where: { userId: user.id, id: { not: reset.id }, usedAt: null },
        data: { usedAt },
      });
      await appendAuditLog(tx, {
        clinicId: user.clinicId,
        userId: user.id,
        action: "Contrasena restablecida",
        cat: "sesion",
        ip: req.ip ?? null,
      });
    });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

router.post("/login", loginLimit, async (req, res, next) => {
  try {
    const body = loginSchema.parse(req.body);
    const email = normalizeEmail(body.email);
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw unauthorized("Credenciales invalidas");
    if (!user.active) throw unauthorized("Usuario inactivo");

    const ok = await bcrypt.compare(body.password, user.passwordHash);
    if (!ok) throw unauthorized("Credenciales invalidas");

    if (!isProductionAuthVerificationEnabled()) {
      res.json(await completeLogin(user, req.ip ?? null));
      return;
    }

    if (!user.mfaEnabled) {
      res.json(await completeLogin(user, req.ip ?? null));
      return;
    }

    if (!body.emailCode) {
      res.status(200).json(await issueEmailCode(user, req.ip ?? null));
      return;
    }

    const emailCodeState = readEmailCodeState(user.emailCodeHash, user.emailCodeExpiresAt, user.mfaSecret);
    if (!emailCodeState) {
      throw badRequest("Solicite un nuevo codigo de verificacion");
    }
    if (emailCodeState.expiresAt.getTime() < Date.now()) {
      const hasLegacyEmailCode = Boolean(readEmailCodeState(null, null, user.mfaSecret));
      await prisma.user.update({
        where: { id: user.id },
        data: {
          emailCodeHash: null,
          emailCodeExpiresAt: null,
          ...(hasLegacyEmailCode ? { mfaSecret: null } : {}),
        },
      });
      throw unauthorized("El codigo de verificacion expiro");
    }
    if (hashLoginEmailCode(user.id, body.emailCode) !== emailCodeState.hash) {
      await recordAudit({
        clinicId: user.clinicId,
        userId: user.id,
        action: "Intento de inicio de sesion denegado",
        cat: "sesion",
        label: "Codigo de email invalido",
        ip: req.ip ?? null,
      });
      throw unauthorized("Codigo de verificacion invalido");
    }

    res.json(await completeLogin(user, req.ip ?? null));
  } catch (e) {
    next(e);
  }
});

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) throw unauthorized();
    res.json({ profile: serialize(user) });
  } catch (e) {
    next(e);
  }
});

router.post("/logout", requireAuth, async (req, res) => {
  await recordAudit({
    clinicId: req.user!.clinicId,
    userId: req.user!.id,
    action: "Cerro sesion",
    cat: "sesion",
    ip: req.ip ?? null,
  });
  res.json({ ok: true });
});

type UserRow = NonNullable<Awaited<ReturnType<typeof prisma.user.findUnique>>>;
function serialize(u: UserRow) {
  const { passwordHash, mfaSecret, emailCodeHash, emailCodeExpiresAt, authVersion, ...rest } = u;
  void passwordHash;
  void mfaSecret;
  void emailCodeHash;
  void emailCodeExpiresAt;
  void authVersion;
  return rest;
}

export default router;
