import type { Role } from "./types";

export const ROLES: Record<
  Role,
  { id: Role; label: string; short: string; color: string; mfa: boolean; desc: string }
> = {
  admin: {
    id: "admin",
    label: "Dueño / Admin",
    short: "Admin",
    color: "#00AC9A",
    mfa: true,
    desc: "Acceso total al sistema y a la configuración.",
  },
  recepcion: {
    id: "recepcion",
    label: "Recepción",
    short: "Recepción",
    color: "#0E7490",
    mfa: false,
    desc: "Agenda, pacientes, cobros y emisión de facturas.",
  },
  profesional: {
    id: "profesional",
    label: "Profesional",
    short: "Médico",
    color: "#7A4A2B",
    mfa: false,
    desc: "Historia clínica, fotos y procedimientos.",
  },
  esteticista: {
    id: "esteticista",
    label: "Esteticista",
    short: "Estética",
    color: "#B7791F",
    mfa: false,
    desc: "Procedimientos estéticos y evolución limitada.",
  },
  contador: {
    id: "contador",
    label: "Contador",
    short: "Contable",
    color: "#5B6472",
    mfa: false,
    desc: "Facturación electrónica y reportes financieros.",
  },
};

export type ModuleId =
  | "agenda"
  | "pacientes"
  | "historia"
  | "fotos"
  | "consentimientos"
  | "paquetes"
  | "pagos"
  | "facturacion"
  | "inventario"
  | "reportes"
  | "sistema"
  | "procedimientos"
  | "servicios";

export const PERM: Record<Role, Record<ModuleId, string>> = {
  admin: {
    agenda: "Total",
    pacientes: "Total",
    historia: "Total",
    fotos: "Total",
    consentimientos: "Total",
    paquetes: "Total",
    pagos: "Total",
    facturacion: "Total",
    inventario: "Total",
    reportes: "Total",
    sistema: "Total",
    procedimientos: "Total",
    servicios: "Total",
  },
  recepcion: {
    agenda: "Crear/editar",
    pacientes: "Crear/editar",
    historia: "—",
    fotos: "Miniaturas",
    consentimientos: "Gestionar firma",
    paquetes: "Vender/registrar",
    pagos: "Cobrar",
    facturacion: "Emitir",
    inventario: "Ver",
    reportes: "Limitado",
    sistema: "—",
    procedimientos: "Ver",
    servicios: "Ver",
  },
  profesional: {
    agenda: "Su agenda",
    pacientes: "Ver",
    historia: "Crear/editar",
    fotos: "Total",
    consentimientos: "Gestionar",
    paquetes: "Ver",
    pagos: "—",
    facturacion: "—",
    inventario: "Consumir",
    reportes: "Suyos",
    sistema: "—",
    procedimientos: "Total",
    servicios: "Ver",
  },
  esteticista: {
    agenda: "Su agenda",
    pacientes: "Ver",
    historia: "Limitado",
    fotos: "Subir/ver",
    consentimientos: "Gestionar",
    paquetes: "Ejecutar",
    pagos: "—",
    facturacion: "—",
    inventario: "Consumir",
    reportes: "Suyos",
    sistema: "—",
    procedimientos: "Total",
    servicios: "Ver",
  },
  contador: {
    agenda: "Ver",
    pacientes: "Ver",
    historia: "—",
    fotos: "—",
    consentimientos: "—",
    paquetes: "Ver",
    pagos: "Ver/conciliar",
    facturacion: "Total",
    inventario: "Ver",
    reportes: "Financieros",
    sistema: "—",
    procedimientos: "—",
    servicios: "Ver",
  },
};

export function roleCan(role: Role, moduleId: ModuleId): boolean {
  const v = PERM[role]?.[moduleId];
  return !!v && v !== "—";
}

const WRITE_PERMS = new Set([
  "Total",
  "Crear/editar",
  "Cobrar",
  "Emitir",
  "Vender/registrar",
  "Su agenda",
  "Subir/ver",
  "Gestionar",
  "Gestionar firma",
  "Limitado",
]);

export function roleCanWrite(role: Role, moduleId: ModuleId): boolean {
  const v = PERM[role]?.[moduleId];
  return !!v && WRITE_PERMS.has(v);
}
