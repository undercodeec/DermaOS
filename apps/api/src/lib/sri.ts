// SRI helpers: totales y clave de acceso 49 dígitos (módulo 11).

export interface InvoiceLineInput {
  serviceId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
}

export function calcInvoiceTotals(lines: InvoiceLineInput[]) {
  let subtotal0 = 0;
  let subtotal15 = 0;
  for (const l of lines) {
    const amt = l.quantity * l.unitPrice;
    if (l.vatRate === 15) subtotal15 += amt;
    else subtotal0 += amt;
  }
  const vatAmount = +(subtotal15 * 0.15).toFixed(2);
  return {
    subtotal0: +subtotal0.toFixed(2),
    subtotal15: +subtotal15.toFixed(2),
    vatAmount,
    total: +(subtotal0 + subtotal15 + vatAmount).toFixed(2),
  };
}

const pad = (n: number, l = 2) => String(n).padStart(l, "0");

export function sriAccessKey(date: Date, seq: number, ruc: string) {
  const fecha = pad(date.getDate()) + pad(date.getMonth() + 1) + date.getFullYear();
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

// Siguiente número de factura "001-001-XXXXXXXXX" a partir del último almacenado.
export function nextInvoiceNumber(lastNumber: string | null) {
  const seq = lastNumber ? Number(lastNumber.split("-").pop() || 0) + 1 : 243;
  return { seq, number: "001-001-" + pad(seq, 9) };
}

export function invoiceNumber(seq: number) {
  return "001-001-" + pad(seq, 9);
}

export const EMISOR_RUC = "1792345678001";
