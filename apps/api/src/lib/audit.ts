import { prisma } from "../db.js";
import type { Request } from "express";

export type AuditCat =
  | "sesion" | "historia" | "fotos" | "consentimiento" | "facturacion"
  | "paquetes" | "pagos" | "agenda" | "sistema";

export async function audit(
  req: Request,
  action: string,
  cat: AuditCat,
  label = "",
) {
  const u = req.user;
  if (!u) return;
  await prisma.auditLog.create({
    data: {
      clinicId: u.clinicId,
      userId: u.id,
      action,
      cat,
      label,
      ip: req.ip ?? null,
    },
  });
}
