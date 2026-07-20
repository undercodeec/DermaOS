import mammoth from "mammoth";
// Se importa la implementación directa: el entrypoint histórico de pdf-parse ejecuta
// un archivo de ejemplo al cargarse como módulo ESM.
import pdfParse from "pdf-parse/lib/pdf-parse.js";
import PDFDocument from "pdfkit";
import { badRequest } from "./errors.js";
import crypto from "node:crypto";

const PDF_MIME = "application/pdf";
const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export async function extractConsentText(buffer: Buffer, mimetype: string, filename: string) {
  const lower = filename.toLowerCase();
  let text = "";
  if (mimetype === PDF_MIME || lower.endsWith(".pdf")) {
    text = (await pdfParse(buffer)).text;
  } else if (mimetype === DOCX_MIME || lower.endsWith(".docx")) {
    text = (await mammoth.extractRawText({ buffer })).value;
  } else {
    throw badRequest("Solo se admiten documentos PDF o DOCX");
  }

  const normalized = text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (normalized.length < 20) {
    throw badRequest("No se pudo extraer texto suficiente. Si el PDF es escaneado, transcriba el contenido manualmente.");
  }
  return normalized;
}

export interface ConsentPdfInput {
  clinic: { name: string; ruc: string | null; logoData: string | null };
  patient: { name: string; idType: string; idNumber: string; birthDate: Date };
  consent: {
    id: string;
    title: string;
    body: string;
    kind: "clinico" | "imagen";
    version: number | null;
    signedAt: Date | null;
    signedIp: string | null;
    signaturePath: string | null;
    contentHash?: string | null;
    signatureHash?: string | null;
  };
}

export function buildConsentPdf(input: ConsentPdfInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 54, bufferPages: true, info: { Title: input.consent.title } });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const logo = dataUrlBuffer(input.clinic.logoData);
    if (logo) {
      try {
        doc.image(logo, doc.page.margins.left, 42, { fit: [110, 52], valign: "center" });
      } catch {
        // Un logo inválido no debe impedir descargar el documento legal.
      }
    }
    doc.font("Helvetica-Bold").fontSize(15).text(input.clinic.name, logo ? 180 : 54, 48, {
      width: logo ? 360 : pageWidth,
      align: "right",
    });
    if (input.clinic.ruc) {
      doc.font("Helvetica").fontSize(9).text(`RUC: ${input.clinic.ruc}`, { align: "right" });
    }
    doc.moveDown(2.2);
    doc.moveTo(54, doc.y).lineTo(doc.page.width - 54, doc.y).strokeColor("#B7A58F").stroke();
    doc.moveDown(1.3);

    doc.fillColor("#1F2937").font("Helvetica-Bold").fontSize(16).text(input.consent.title, { align: "center" });
    doc.moveDown(0.5);
    doc.font("Helvetica").fontSize(9).fillColor("#6B7280").text(
      `${input.consent.kind === "imagen" ? "Consentimiento de uso de imagen" : "Consentimiento clínico"}`
      + `${input.consent.version ? ` · Versión ${input.consent.version}` : ""}`,
      { align: "center" },
    );
    doc.moveDown(1.5);

    doc.fillColor("#1F2937").font("Helvetica-Bold").fontSize(10).text("DATOS DEL PACIENTE");
    doc.moveDown(0.35);
    doc.font("Helvetica").fontSize(10).text(
      `${input.patient.name} · ${input.patient.idType.toUpperCase()}: ${input.patient.idNumber}`,
    );
    doc.text(`Fecha de nacimiento: ${formatDate(input.patient.birthDate)}`);
    doc.moveDown(1.2);

    doc.font("Helvetica").fontSize(10.5).fillColor("#1F2937").text(input.consent.body, {
      align: "justify",
      lineGap: 3,
    });
    doc.moveDown(1.4);
    doc.font("Helvetica-Bold").fontSize(10).text(
      "Declaro que he leído y comprendido este documento, que tuve la oportunidad de realizar preguntas y que acepto de forma libre y voluntaria.",
      { align: "justify", lineGap: 2 },
    );
    doc.moveDown(1.4);

    const signature = dataUrlBuffer(input.consent.signaturePath);
    if (signature) {
      try {
        doc.image(signature, doc.x, doc.y, { fit: [190, 75] });
        doc.moveDown(5.2);
      } catch {
        doc.moveDown(2);
      }
    } else {
      doc.moveDown(3);
    }
    doc.moveTo(doc.x, doc.y).lineTo(doc.x + 220, doc.y).strokeColor("#6B7280").stroke();
    doc.moveDown(0.35);
    doc.font("Helvetica").fontSize(9).fillColor("#374151").text("Firma del paciente", { width: 220, align: "center" });
    doc.text(input.patient.name, { width: 220, align: "center" });
    doc.moveDown(1);
    doc.fontSize(8).fillColor("#6B7280").text(
      `Firmado: ${input.consent.signedAt ? formatDateTime(input.consent.signedAt) : "Pendiente"}`
      + `${input.consent.signedIp ? ` · IP registrada: ${input.consent.signedIp}` : ""}`,
    );
    doc.text(`Identificador de documento: ${input.consent.id}`);
    if (input.consent.contentHash) doc.text(`Huella de contenido (SHA-256): ${input.consent.contentHash}`);
    if (input.consent.signatureHash) doc.text(`Huella de firma (SHA-256): ${input.consent.signatureHash}`);

    const pages = doc.bufferedPageRange();
    for (let i = pages.start; i < pages.start + pages.count; i += 1) {
      doc.switchToPage(i);
      doc.font("Helvetica").fontSize(7.5).fillColor("#9CA3AF").text(
        `DERMA-OS · Página ${i + 1} de ${pages.count}`,
        54,
        doc.page.height - 34,
        { width: pageWidth, align: "center" },
      );
    }
    doc.end();
  });
}

export function sha256(value: string | Buffer) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function consentContentHash(input: {
  consentId: string;
  clinicId: string;
  clinicName: string;
  clinicRuc: string | null;
  patientId: string;
  patientName: string;
  patientIdType: string;
  patientIdNumber: string;
  patientBirthDate: Date;
  templateId: string;
  templateTitle: string;
  templateBody: string;
  templateKind: "clinico" | "imagen";
  templateVersion: number | null;
  signedAt: Date;
}) {
  return sha256(JSON.stringify({
    consentId: input.consentId,
    clinicId: input.clinicId,
    clinicName: input.clinicName,
    clinicRuc: input.clinicRuc,
    patientId: input.patientId,
    patientName: input.patientName,
    patientIdType: input.patientIdType,
    patientIdNumber: input.patientIdNumber,
    patientBirthDate: input.patientBirthDate.toISOString().slice(0, 10),
    templateId: input.templateId,
    templateTitle: input.templateTitle,
    templateBody: input.templateBody,
    templateKind: input.templateKind,
    templateVersion: input.templateVersion,
    signedAt: input.signedAt.toISOString(),
  }));
}

function dataUrlBuffer(value: string | null) {
  if (!value) return null;
  const match = value.match(/^data:[^;]+;base64,(.+)$/);
  if (!match) return null;
  return Buffer.from(match[1], "base64");
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("es-EC", { timeZone: "America/Guayaquil", dateStyle: "long" }).format(value);
}

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("es-EC", {
    timeZone: "America/Guayaquil",
    dateStyle: "long",
    timeStyle: "short",
  }).format(value);
}
