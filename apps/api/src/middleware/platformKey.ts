import type { RequestHandler } from "express";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { env } from "../env.js";
import { unauthorized } from "../lib/errors.js";

interface PlatformTokenPayload {
  sub: "platform-admin";
  email: string;
  scope: "platform";
}

interface PlatformMfaPayload {
  sub: "platform-mfa";
  email: string;
  scope: "platform-mfa";
  codeHash: string;
  jti: string;
  exp?: number;
}

const consumedChallenges = new Map<string, number>();

function sameSecret(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export function signPlatformToken(email: string) {
  return jwt.sign(
    { sub: "platform-admin", email, scope: "platform" } satisfies PlatformTokenPayload,
    env.PLATFORM_JWT_SECRET ?? env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN } as jwt.SignOptions,
  );
}

export function verifyPlatformCredentials(email: string, password: string) {
  const expectedEmail = env.PLATFORM_ADMIN_EMAIL.trim().toLowerCase();
  const expectedPassword = env.PLATFORM_ADMIN_PASSWORD ?? "";
  if (!expectedPassword) return false;
  return email.trim().toLowerCase() === expectedEmail && sameSecret(password, expectedPassword);
}

function platformCodeHash(email: string, code: string, jti: string) {
  return crypto.createHash("sha256").update(
    `${env.PLATFORM_JWT_SECRET ?? env.JWT_SECRET}:platform-mfa:${email.toLowerCase()}:${jti}:${code}`,
  ).digest("hex");
}

export function signPlatformMfaChallenge(email: string, code: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const jti = crypto.randomUUID();
  return jwt.sign(
    {
      sub: "platform-mfa",
      email: normalizedEmail,
      scope: "platform-mfa",
      codeHash: platformCodeHash(normalizedEmail, code, jti),
      jti,
    } satisfies PlatformMfaPayload,
    env.PLATFORM_JWT_SECRET ?? env.JWT_SECRET,
    { expiresIn: `${env.AUTH_EMAIL_CODE_TTL_MINUTES}m` } as jwt.SignOptions,
  );
}

export function verifyPlatformMfaChallenge(challengeToken: string, code: string) {
  try {
    const now = Math.floor(Date.now() / 1000);
    for (const [jti, expiresAt] of consumedChallenges) {
      if (expiresAt <= now) consumedChallenges.delete(jti);
    }
    const payload = jwt.verify(
      challengeToken,
      env.PLATFORM_JWT_SECRET ?? env.JWT_SECRET,
    ) as PlatformMfaPayload;
    if (payload.sub !== "platform-mfa" || payload.scope !== "platform-mfa" || !payload.jti || !payload.codeHash) return null;
    if (payload.email !== env.PLATFORM_ADMIN_EMAIL.trim().toLowerCase()) return null;
    if (consumedChallenges.has(payload.jti)) return null;
    const expected = platformCodeHash(payload.email, code, payload.jti);
    if (!sameSecret(expected, payload.codeHash)) return null;
    consumedChallenges.set(payload.jti, payload.exp ?? now + env.AUTH_EMAIL_CODE_TTL_MINUTES * 60);
    return payload.email;
  } catch {
    return null;
  }
}

export const requirePlatformAuth: RequestHandler = (req, _res, next) => {
  const header = req.header("authorization") ?? "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) return next(unauthorized("Sesion de superadmin requerida"));
  try {
    const payload = jwt.verify(token, env.PLATFORM_JWT_SECRET ?? env.JWT_SECRET) as Partial<PlatformTokenPayload>;
    if (payload.scope !== "platform" || payload.email?.toLowerCase() !== env.PLATFORM_ADMIN_EMAIL.toLowerCase()) {
      return next(unauthorized("Sesion de superadmin invalida"));
    }
    next();
  } catch {
    next(unauthorized("Sesion de superadmin expirada"));
  }
};

// Compatibilidad temporal con codigo antiguo. No usar para nuevas rutas.
export const requirePlatformKey: RequestHandler = (req, _res, next) => {
  const raw = req.headers["x-platform-key"];
  const key = Array.isArray(raw) ? "" : raw;
  if (!key || !sameSecret(key, env.PLATFORM_REGISTER_KEY)) {
    return next(unauthorized("Platform key invalida o ausente"));
  }
  next();
};
