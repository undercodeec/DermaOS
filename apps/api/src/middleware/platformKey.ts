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
