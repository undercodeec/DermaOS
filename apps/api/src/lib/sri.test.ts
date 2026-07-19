import assert from "node:assert/strict";
import test from "node:test";
import { calcInvoiceTotals, invoiceNumber, sriAccessKey } from "./sri.js";

test("numero de factura usa nueve digitos", () => {
  assert.equal(invoiceNumber(243), "001-001-000000243");
});

test("totales se calculan con IVA 0 e IVA 15", () => {
  assert.deepEqual(calcInvoiceTotals([
    { serviceId: "a", description: "Consulta", quantity: 1, unitPrice: 30, vatRate: 0 },
    { serviceId: "b", description: "Tratamiento", quantity: 2, unitPrice: 10, vatRate: 15 },
  ]), {
    subtotal0: 30,
    subtotal15: 20,
    vatAmount: 3,
    total: 53,
  });
});

test("clave SRI tiene 49 digitos", () => {
  const key = sriAccessKey(new Date("2026-07-18T12:00:00Z"), 243, "1792345678001");
  assert.match(key, /^\d{49}$/);
});
