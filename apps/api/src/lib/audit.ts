import { prisma } from "../db.js";
import type { Request } from "express";
import crypto from "node:crypto";
import { Prisma } from "@prisma/client";

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
  const id = crypto.randomUUID();
  const at = new Date();
  const ip = req.ip ?? null;
  await prisma.$transaction(async (tx) => {
    // Serializa la cadena por clínica para evitar bifurcaciones por escrituras concurrentes.
    await tx.$queryRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${u.clinicId}))`);
    const previous = await tx.auditLog.findFirst({
      where: { clinicId: u.clinicId, entryHash: { not: null } },
      orderBy: { chainSequence: "desc" },
      select: { entryHash: true, chainSequence: true },
    });
    const previousHash = previous?.entryHash ?? null;
    const chainSequence = (previous?.chainSequence ?? 0) + 1;
    const entryHash = crypto.createHash("sha256").update(JSON.stringify({
      id,
      clinicId: u.clinicId,
      userId: u.id,
      action,
      cat,
      label,
      at: at.toISOString(),
      ip,
      previousHash,
      chainSequence,
    })).digest("hex");
    await tx.auditLog.create({
      data: { id, clinicId: u.clinicId, userId: u.id, action, cat, label, at, ip, previousHash, entryHash, chainSequence },
    });
  });
}
