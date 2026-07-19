import type { Request, Response, NextFunction } from "express";
import type { Role } from "@prisma/client";
import { prisma } from "../db.js";
import { verifyToken } from "../lib/jwt.js";
import { unauthorized, forbidden } from "../lib/errors.js";
import {
  roleCan,
  roleCanConsume,
  roleCanReconcile,
  roleCanWrite,
  type ModuleId,
} from "../lib/permissions.js";
import { requireClinicModuleAccess } from "../lib/entitlements.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: { id: string; email: string; role: Role; clinicId: string; professionalId: string | null };
    }
  }
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.header("authorization") ?? "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) return next(unauthorized());

  let payload: ReturnType<typeof verifyToken>;
  try {
    payload = verifyToken(token);
  } catch {
    return next(unauthorized("Token invalido o expirado"));
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        role: true,
        active: true,
        clinicId: true,
        professionalId: true,
        clinic: { select: { active: true } },
      },
    });
    if (!user?.active || !user.clinic.active) {
      return next(unauthorized("Usuario o clinica inactiva"));
    }
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      clinicId: user.clinicId,
      professionalId: user.professionalId,
    };
    return next();
  } catch (e) {
    return next(e);
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(unauthorized());
    if (!roles.includes(req.user.role)) return next(forbidden());
    next();
  };
}

export function requireModule(mod: ModuleId, mode: "read" | "write" | "reconcile" | "consume" = "read") {
  return async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(unauthorized());
    const ok = mode === "write"
      ? roleCanWrite(req.user.role, mod)
      : mode === "reconcile"
        ? roleCanReconcile(req.user.role, mod)
        : mode === "consume"
          ? roleCanConsume(req.user.role, mod)
          : roleCan(req.user.role, mod);
    if (!ok) return next(forbidden(`Sin permiso para ${mod}`));
    try {
      await requireClinicModuleAccess(req.user.clinicId, mod);
      next();
    } catch (e) {
      next(e);
    }
  };
}
