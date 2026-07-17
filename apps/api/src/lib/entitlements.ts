import { prisma } from "../db.js";
import { forbidden } from "./errors.js";
import type { ModuleId } from "./permissions.js";

export const ALL_MODULES: ModuleId[] = [
  "agenda",
  "pacientes",
  "historia",
  "fotos",
  "consentimientos",
  "paquetes",
  "pagos",
  "facturacion",
  "inventario",
  "reportes",
  "sistema",
  "procedimientos",
  "servicios",
];

export type AccessStatus = "pending_verification" | "trialing" | "active" | "expired" | "suspended";

export function addDays(from: Date, days: number) {
  return new Date(from.getTime() + days * 864e5);
}

export function addMonths(from: Date, months: number) {
  const d = new Date(from);
  d.setMonth(d.getMonth() + months);
  return d;
}

export function effectiveStatus(sub: {
  status: string;
  trialEndsAt: Date | null;
  subscriptionEndsAt: Date | null;
} | null, now = new Date()): AccessStatus {
  if (!sub) return "pending_verification";
  if (sub.status === "suspended") return "suspended";
  if (sub.status === "active" && sub.subscriptionEndsAt && sub.subscriptionEndsAt > now) return "active";
  if (sub.status === "trialing" && sub.trialEndsAt && sub.trialEndsAt > now) return "trialing";
  if (sub.status === "pending_verification") return "pending_verification";
  return "expired";
}

export function daysLeft(date: Date | null | undefined, now = new Date()) {
  if (!date) return 0;
  return Math.max(0, Math.ceil((date.getTime() - now.getTime()) / 864e5));
}

export async function requireClinicModuleAccess(clinicId: string, moduleId: ModuleId) {
  const clinic = await prisma.clinic.findUnique({
    where: { id: clinicId },
    include: { subscription: true },
  });
  if (!clinic || !clinic.active) throw forbidden("Clinica inactiva");

  const status = effectiveStatus(clinic.subscription);
  if (status !== "active" && status !== "trialing") {
    throw forbidden("Demo o suscripcion expirada");
  }

  const allowed = clinic.subscription?.allowedModules ?? [];
  if (!allowed.includes(moduleId)) {
    throw forbidden(`Modulo ${moduleId} no habilitado para esta clinica`);
  }
}

export async function ensureSubscription(clinicId: string, allowedModules = ALL_MODULES) {
  return prisma.clinicSubscription.upsert({
    where: { clinicId },
    update: {},
    create: {
      clinicId,
      status: "pending_verification",
      allowedModules,
    },
  });
}
