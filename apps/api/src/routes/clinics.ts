import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { z } from "zod";
import { prisma } from "../db.js";
import { env } from "../env.js";
import { signToken } from "../lib/jwt.js";
import { badRequest, conflict, unauthorized } from "../lib/errors.js";
import { ALL_MODULES, addDays } from "../lib/entitlements.js";
import { ipAndEmailKey, rateLimit } from "../middleware/rateLimit.js";
import {
  generateLoginEmailCode,
  hashLoginEmailCode,
  sendRegistrationEmailCode,
} from "../lib/login-email.js";

const router = Router();
const REGISTRATION_CODE_KIND = "registration-email-code";
const TRIAL_DAYS = 7;
const registerLimit = rateLimit({ windowMs: 60 * 60_000, max: 5, key: (req) => req.ip ?? "unknown" });
const verifyLimit = rateLimit({ windowMs: 15 * 60_000, max: 10, key: ipAndEmailKey });

const registerSchema = z.object({
  clinicName: z.string().min(2),
  ruc: z.string().optional(),
  adminName: z.string().min(2),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(8),
});

const verifyEmailSchema = z.object({
  adminEmail: z.string().email(),
  emailCode: z.string().regex(/^\d{6}$/),
});

type UserRow = NonNullable<Awaited<ReturnType<typeof prisma.user.findUnique>>>;

function encodeRegistrationCodeState(userId: string, code: string, expiresAt: Date) {
  return JSON.stringify({
    kind: REGISTRATION_CODE_KIND,
    hash: hashLoginEmailCode(userId, code),
    expiresAt: expiresAt.toISOString(),
  });
}

function readRegistrationCodeState(raw: string | null) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { kind?: string; hash?: string; expiresAt?: string };
    if (parsed.kind !== REGISTRATION_CODE_KIND || !parsed.hash || !parsed.expiresAt) return null;
    const expiresAt = new Date(parsed.expiresAt);
    if (Number.isNaN(expiresAt.getTime())) return null;
    return { hash: parsed.hash, expiresAt };
  } catch {
    return null;
  }
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

function serializeUser(u: UserRow) {
  const { passwordHash, mfaSecret, ...rest } = u;
  void passwordHash;
  void mfaSecret;
  return rest;
}

router.post("/register", registerLimit, async (req, res, next) => {
  try {
    const body = registerSchema.parse(req.body);
    const adminEmail = normalizeEmail(body.adminEmail);
    const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (existing) throw conflict("El email ya esta registrado");

    const passwordHash = await bcrypt.hash(body.adminPassword, 12);
    const requiresEmailVerification = env.NODE_ENV === "production";
    const userId = crypto.randomUUID();
    const code = requiresEmailVerification ? generateLoginEmailCode() : null;
    const expiresAt = new Date(Date.now() + env.AUTH_EMAIL_CODE_TTL_MINUTES * 60 * 1000);
    if (code) await sendRegistrationEmailCode(adminEmail, code);

    const result = await prisma.$transaction(async (tx) => {
      const clinic = await tx.clinic.create({
        data: { name: body.clinicName, ruc: body.ruc?.trim() || null },
      });
      const user = await tx.user.create({
        data: {
          id: userId,
          clinicId: clinic.id,
          fullName: body.adminName,
          email: adminEmail,
          passwordHash,
          role: "admin",
          mfaEnabled: false,
          mfaSecret: code ? encodeRegistrationCodeState(userId, code, expiresAt) : null,
          active: !requiresEmailVerification,
        },
      });
      await tx.clinicSubscription.create({
        data: {
          clinicId: clinic.id,
          status: requiresEmailVerification ? "pending_verification" : "trialing",
          verifiedAt: requiresEmailVerification ? null : new Date(),
          trialStartedAt: requiresEmailVerification ? null : new Date(),
          trialEndsAt: requiresEmailVerification ? null : addDays(new Date(), TRIAL_DAYS),
          allowedModules: requiresEmailVerification ? [] : ALL_MODULES,
        },
      });
      await tx.auditLog.create({
        data: {
          clinicId: clinic.id,
          userId: user.id,
          action: "clinic.register",
          cat: "sistema",
          label: requiresEmailVerification
            ? "Pendiente de verificacion por email"
            : "Demo de desarrollo activada sin verificacion por email",
          ip: req.ip ?? null,
        },
      });
      return { clinic, user };
    });

    if (requiresEmailVerification) {
      res.status(201).json({
        emailVerificationRequired: true,
        emailMasked: maskEmail(result.user.email),
      });
      return;
    }

    const token = signToken({
      sub: result.user.id,
      email: result.user.email,
      role: result.user.role,
      clinicId: result.clinic.id,
    });

    res.status(201).json({
      token,
      profile: serializeUser(result.user),
    });
  } catch (e) {
    next(e);
  }
});

router.post("/verify-email", verifyLimit, async (req, res, next) => {
  try {
    const body = verifyEmailSchema.parse(req.body);
    const adminEmail = normalizeEmail(body.adminEmail);
    const user = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (!user) throw unauthorized("Codigo de verificacion invalido");
    if (user.active) throw badRequest("La cuenta ya fue verificada");

    const codeState = readRegistrationCodeState(user.mfaSecret);
    if (!codeState) throw badRequest("Solicite un nuevo registro");
    if (codeState.expiresAt.getTime() < Date.now()) {
      throw unauthorized("El codigo de verificacion expiro");
    }
    if (hashLoginEmailCode(user.id, body.emailCode) !== codeState.hash) {
      throw unauthorized("Codigo de verificacion invalido");
    }

    const now = new Date();
    const verifiedUser = await prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: {
          active: true,
          mfaSecret: null,
          lastAccess: now,
        },
      });
      await tx.clinicSubscription.update({
        where: { clinicId: user.clinicId },
        data: {
          status: "trialing",
          verifiedAt: now,
          trialStartedAt: now,
          trialEndsAt: addDays(now, TRIAL_DAYS),
          allowedModules: ALL_MODULES,
        },
      });
      await tx.auditLog.create({
        data: {
          clinicId: user.clinicId,
          userId: user.id,
          action: "Email verificado y demo activada",
          cat: "sistema",
          label: `${TRIAL_DAYS} dias`,
          ip: req.ip ?? null,
        },
      });
      return updatedUser;
    });

    const token = signToken({
      sub: verifiedUser.id,
      email: verifiedUser.email,
      role: verifiedUser.role,
      clinicId: verifiedUser.clinicId,
    });

    res.json({
      token,
      profile: serializeUser(verifiedUser),
    });
  } catch (e) {
    next(e);
  }
});

export default router;
