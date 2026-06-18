import { format, parseISO, differenceInYears } from "date-fns";
import { es } from "date-fns/locale";

const pad = (n: number, l = 2) => String(n).padStart(l, "0");

export const fmtDate = (iso: string | Date) =>
  format(typeof iso === "string" ? parseISO(iso) : iso, "dd/MM/yyyy");

export const fmtTime = (iso: string | Date) =>
  format(typeof iso === "string" ? parseISO(iso) : iso, "HH:mm");

export const fmtDateLong = (iso: string | Date) =>
  format(typeof iso === "string" ? parseISO(iso) : iso, "EEEE, d 'de' MMMM 'de' yyyy", {
    locale: es,
  });

export const fmtMoney = (n: number) =>
  "$" + (n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const age = (birthIso: string) =>
  differenceInYears(new Date(), parseISO(birthIso));

export const initials = (p: { first_name: string; last_name: string }) =>
  (p.first_name[0] || "") + (p.last_name[0] || "");

export const fullName = (p: { first_name: string; last_name: string } | null | undefined) =>
  p ? `${p.first_name} ${p.last_name}` : "—";

export interface InvoiceLine {
  quantity: number;
  unitPrice: number;
  vatRate: number;
}

export function calcInvoiceTotals(lines: InvoiceLine[]) {
  let subtotal0 = 0;
  let subtotal15 = 0;
  for (const l of lines) {
    const amt = l.quantity * l.unitPrice;
    if (l.vatRate === 15) subtotal15 += amt;
    else subtotal0 += amt;
  }
  const vatAmount = subtotal15 * 0.15;
  return { subtotal0, subtotal15, vatAmount, total: subtotal0 + subtotal15 + vatAmount };
}

// SRI: clave de acceso 49 dígitos con dígito verificador módulo 11.
export function sriAccessKey(dateIso: string, seq: number, ruc: string) {
  const d = new Date(dateIso);
  const fecha = pad(d.getDate()) + pad(d.getMonth() + 1) + d.getFullYear();
  const base = fecha + "01" + ruc + "1" + "001001" + pad(seq, 9) + "17283946" + "1";
  let sum = 0;
  let mul = 2;
  for (let i = base.length - 1; i >= 0; i--) {
    sum += Number(base[i]) * mul;
    mul = mul === 7 ? 2 : mul + 1;
  }
  let dv = 11 - (sum % 11);
  if (dv === 11) dv = 0;
  if (dv === 10) dv = 1;
  return base + dv;
}
