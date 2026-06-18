import type { PaymentConcept, PaymentStatus, Role } from "@/lib/types";

export const PAY_CONCEPTS: Record<PaymentConcept, { label: string; icon: string }> = {
  libre: { label: "Cobro libre", icon: "card" },
  deposito: { label: "Depósito de reserva", icon: "lock" },
  paquete: { label: "Saldo de paquete", icon: "layers" },
  factura: { label: "Factura", icon: "receipt" },
};

export const PAY_STATUS: Record<PaymentStatus, { label: string; cls: string }> = {
  pendiente: { label: "Pendiente", cls: "bg-warn" },
  pagado: { label: "Pagado", cls: "bg-ok" },
  anulado: { label: "Anulado", cls: "bg-neutral" },
};

export function canCobrar(role: Role) {
  return role === "admin" || role === "recepcion";
}

export function canConciliar(role: Role) {
  return role === "admin" || role === "recepcion" || role === "contador";
}
