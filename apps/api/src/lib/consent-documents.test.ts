import assert from "node:assert/strict";
import test from "node:test";
import { buildConsentPdf, extractConsentText } from "./consent-documents.js";

test("genera un PDF de consentimiento con datos clínicos", async () => {
  const pdf = await buildConsentPdf({
    clinic: { name: "Clínica Dermatológica", ruc: "1790000000001", logoData: null },
    patient: {
      firstName: "María",
      lastName: "Pérez",
      idType: "cedula",
      idNumber: "1712345678",
      birthDate: new Date("1990-05-10T00:00:00.000Z"),
    },
    consent: {
      id: "00000000-0000-0000-0000-000000000001",
      title: "Consentimiento informado",
      body: "Declaro que he recibido información suficiente sobre el procedimiento, sus beneficios, riesgos y alternativas.",
      kind: "clinico",
      version: 1,
      signedAt: new Date("2026-07-20T15:00:00.000Z"),
      signedIp: "127.0.0.1",
      signaturePath: null,
    },
  });

  assert.equal(pdf.subarray(0, 4).toString("ascii"), "%PDF");
  assert.ok(pdf.length > 1_000);
  const extracted = await extractConsentText(pdf, "application/pdf", "consentimiento.pdf");
  assert.match(extracted, /Consentimiento informado/i);
});
