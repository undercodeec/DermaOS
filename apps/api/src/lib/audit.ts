import { prisma } from "../db.js";
import type { Request } from "express";
import crypto from "node:crypto";
import { Prisma } from "@prisma/client";

export type AuditCat =
  | "sesion" | "historia" | "fotos" | "consentimiento" | "facturacion"
  | "paquetes" | "pagos" | "agenda" | "sistema" | "plataforma";

export interface AuditEntry {
  clinicId: string;
  userId: string | null;
  action: string;
  cat: AuditCat;
  label?: string;
  ip?: string | null;
  at?: Date;
}

export async function appendAuditLog(tx: Prisma.TransactionClient, entry: AuditEntry) {
  const id = crypto.randomUUID();
  const at = entry.at ?? new Date();
  const label = entry.label ?? "";
  const ip = entry.ip ?? null;
  await tx.$queryRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${entry.clinicId}))`);
  const previous = await tx.auditLog.findFirst({
    where: { clinicId: entry.clinicId, entryHash: { not: null } },
    orderBy: { chainSequence: "desc" },
    select: { entryHash: true, chainSequence: true },
  });
  const previousHash = previous?.entryHash ?? null;
  const chainSequence = (previous?.chainSequence ?? 0) + 1;
  const entryHash = crypto.createHash("sha256").update(JSON.stringify({
    id,
    clinicId: entry.clinicId,
    userId: entry.userId,
    action: entry.action,
    cat: entry.cat,
    label,
    at: at.toISOString(),
    ip,
    previousHash,
    chainSequence,
  })).digest("hex");
  return tx.auditLog.create({
    data: {
      id,
      clinicId: entry.clinicId,
      userId: entry.userId,
      action: entry.action,
      cat: entry.cat,
      label,
      at,
      ip,
      previousHash,
      entryHash,
      chainSequence,
    },
  });
}

export async function recordAudit(entry: AuditEntry) {
  return prisma.$transaction((tx) => appendAuditLog(tx, entry));
}

export async function audit(
  req: Request,
  action: string,
  cat: AuditCat,
  label = "",
) {
  const u = req.user;
  if (!u) return;
  await recordAudit({
    clinicId: u.clinicId,
    userId: u.id,
    action,
    cat,
    label,
    ip: req.ip ?? null,
  });
}
