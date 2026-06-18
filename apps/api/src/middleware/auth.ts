import type { Request, Response, NextFunction } from "express";
import type { Role } from "@prisma/client";
import { verifyToken } from "../lib/jwt.js";
import { unauthorized, forbidden } from "../lib/errors.js";
import { roleCan, roleCanWrite, type ModuleId } from "../lib/permissions.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: { id: string; email: string; role: Role };
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.header("authorization") ?? "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) return next(unauthorized());
  try {
    const payload = verifyToken(token);
    req.user = { id: payload.sub, email: payload.email, role: payload.role };
    return next();
  } catch {
    return next(unauthorized("Token inválido o expirado"));
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(unauthorized());
    if (!roles.includes(req.user.role)) return next(forbidden());
    next();
  };
}

export function requireModule(mod: ModuleId, mode: "read" | "write" = "read") {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(unauthorized());
    const ok = mode === "write" ? roleCanWrite(req.user.role, mod) : roleCan(req.user.role, mod);
    if (!ok) return next(forbidden(`Sin permiso para ${mod}`));
    next();
  };
}
