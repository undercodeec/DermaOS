import assert from "node:assert/strict";
import test from "node:test";
import { buildConsentPdf, consentContentHash, extractConsentText, sha256 } from "./consent-documents.js";

test("genera un PDF de consentimiento con datos clínicos", async () => {
  const signedAt = new Date("2026-07-20T15:00:00.000Z");
  const contentHash = consentContentHash({
    consentId: "00000000-0000-0000-0000-000000000001",
    clinicId: "00000000-0000-0000-0000-000000000002",
    clinicName: "Clínica Dermatológica",
    clinicRuc: "1790000000001",
    patientId: "00000000-0000-0000-0000-000000000003",
    patientName: "María Pérez",
    patientIdType: "cedula",
    patientIdNumber: "1712345678",
    patientBirthDate: new Date("1990-05-10T00:00:00.000Z"),
    templateId: "00000000-0000-0000-0000-000000000004",
    templateTitle: "Consentimiento informado",
    templateBody: "Declaro que he recibido información suficiente sobre el procedimiento, sus beneficios, riesgos y alternativas.",
    templateKind: "clinico",
    templateVersion: 1,
    signedAt,
  });
  const signatureHash = sha256("data:image/png;base64,ZmlybWE=");
  const pdf = await buildConsentPdf({
    clinic: { name: "Clínica Dermatológica", ruc: "1790000000001", logoData: null },
    patient: {
      name: "María Pérez",
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
      signedAt,
      signedIp: "127.0.0.1",
      signaturePath: null,
      contentHash,
      signatureHash,
    },
  });

  assert.equal(pdf.subarray(0, 4).toString("ascii"), "%PDF");
  assert.ok(pdf.length > 1_000);
  const extracted = await extractConsentText(pdf, "application/pdf", "consentimiento.pdf");
  assert.match(extracted, /Consentimiento informado/i);
  assert.equal(contentHash.length, 64);
  assert.equal(signatureHash.length, 64);
});

test("la huella cambia si se modifica el texto legal", () => {
  const base = {
    consentId: "1", clinicId: "2", clinicName: "Clínica", clinicRuc: null,
    patientId: "3", patientName: "Paciente", patientIdType: "cedula", patientIdNumber: "123",
    patientBirthDate: new Date("1990-01-01T00:00:00.000Z"), templateId: "4",
    templateTitle: "Consentimiento", templateKind: "clinico" as const, templateVersion: 1,
    signedAt: new Date("2026-07-20T00:00:00.000Z"),
  };
  assert.notEqual(
    consentContentHash({ ...base, templateBody: "Texto legal original" }),
    consentContentHash({ ...base, templateBody: "Texto legal alterado" }),
  );
});
