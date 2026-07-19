import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../db.js";
import { env } from "../env.js";
import { signToken } from "../lib/jwt.js";
import { requireAuth } from "../middleware/auth.js";
import { ipAndEmailKey, rateLimit } from "../middleware/rateLimit.js";
import { badRequest, unauthorized } from "../lib/errors.js";
import {
  generateLoginEmailCode,
  hashLoginEmailCode,
  isProductionAuthVerificationEnabled,
  sendLoginEmailCode,
} from "../lib/login-email.js";

const router = Router();
const loginLimit = rateLimit({ windowMs: 15 * 60_000, max: 10, key: ipAndEmailKey });

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  emailCode: z.string().regex(/^\d{6}$/).optional(),
});

function buildLoginResponse(user: UserRow) {
  const token = signToken({ sub: user.id, email: user.email, role: user.role, clinicId: user.clinicId });
  return { token, profile: serialize(user) };
}

function encodeEmailCodeState(userId: string, code: string, expiresAt: Date) {
  return JSON.stringify({
    kind: "email-code",
    hash: hashLoginEmailCode(userId, code),
    expiresAt: expiresAt.toISOString(),
  });
}

function readEmailCodeState(raw: string | null) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { kind?: string; hash?: string; expiresAt?: string };
    if (parsed.kind !== "email-code" || !parsed.hash || !parsed.expiresAt) return null;
    const expiresAt = new Date(parsed.expiresAt);
    if (Number.isNaN(expiresAt.getTime())) return null;
    return { hash: parsed.hash, expiresAt };
  } catch {
    return null;
  }
}

async function completeLogin(user: UserRow, ip: string | null) {
  await prisma.user.update({
    where: { id: user.id },
    data: {
      lastAccess: new Date(),
      mfaSecret: null,
    },
  });
  await prisma.auditLog.create({
    data: {
      clinicId: user.clinicId,
      userId: user.id,
      action: "Inicio de sesion",
      cat: "sesion",
      label: user.mfaEnabled && isProductionAuthVerificationEnabled()
        ? "Codigo por email verificado"
        : "Sesion iniciada",
      ip,
    },
  });
  return buildLoginResponse(user);
}

async function issueEmailCode(user: UserRow, ip: string | null) {
  const code = generateLoginEmailCode();
  const expiresAt = new Date(Date.now() + env.AUTH_EMAIL_CODE_TTL_MINUTES * 60 * 1000);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      mfaSecret: encodeEmailCodeState(user.id, code, expiresAt),
    },
  });
  await sendLoginEmailCode(user.email, code);
  await prisma.auditLog.create({
    data: {
      clinicId: user.clinicId,
      userId: user.id,
      action: "Envio codigo de acceso por email",
      cat: "sesion",
      label: user.email,
      ip,
    },
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

    const emailCodeState = readEmailCodeState(user.mfaSecret);
    if (!emailCodeState) {
      throw badRequest("Solicite un nuevo codigo de verificacion");
    }
    if (emailCodeState.expiresAt.getTime() < Date.now()) {
      await prisma.user.update({
        where: { id: user.id },
        data: { mfaSecret: null },
      });
      throw unauthorized("El codigo de verificacion expiro");
    }
    if (hashLoginEmailCode(user.id, body.emailCode) !== emailCodeState.hash) {
      await prisma.auditLog.create({
        data: {
          clinicId: user.clinicId,
          userId: user.id,
          action: "Intento de inicio de sesion denegado",
          cat: "sesion",
          label: "Codigo de email invalido",
          ip: req.ip ?? null,
        },
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
  await prisma.auditLog.create({
    data: {
      clinicId: req.user!.clinicId,
      userId: req.user!.id,
      action: "Cerro sesion",
      cat: "sesion",
      ip: req.ip ?? null,
    },
  });
  res.json({ ok: true });
});

type UserRow = NonNullable<Awaited<ReturnType<typeof prisma.user.findUnique>>>;
function serialize(u: UserRow) {
  const { passwordHash, mfaSecret, ...rest } = u;
  void passwordHash;
  void mfaSecret;
  return rest;
}

export default router;
