import { Router } from "express";
import crypto from "node:crypto";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth, requireModule, requireRole } from "../middleware/auth.js";
import { audit } from "../lib/audit.js";
import { conflict, forbidden, notFound } from "../lib/errors.js";
import { buildConsentPdf, consentContentHash, sha256 } from "../lib/consent-documents.js";

const router = Router();
router.use(requireAuth);

const publicTemplateSelect = {
  id: true,
  kind: true,
  title: true,
  procedureType: true,
  body: true,
  status: true,
  seriesId: true,
  version: true,
  approvedAt: true,
  allowedRoles: true,
} as const;

const signSchema = z.object({
  accepted: z.literal(true),
  signaturePath: z.string().max(1_800_000).regex(/^data:image\/png;base64,[A-Za-z0-9+/=]+$/, "Firma inválida"),
});

const publicConsentSelect = {
  id: true,
  patientId: true,
  templateId: true,
  status: true,
  signedAt: true,
  procedureId: true,
  templateTitle: true,
  templateBody: true,
  templateKind: true,
  templateVersion: true,
  signedIp: true,
  signedUserAgent: true,
  signedByUserId: true,
  signedByUserName: true,
  patientName: true,
  patientIdType: true,
  patientIdNumber: true,
  patientBirthDate: true,
  clinicName: true,
  clinicRuc: true,
  contentHash: true,
  signatureHash: true,
  pdfHash: true,
  revokedAt: true,
  revocationReason: true,
  revokedByUserId: true,
  template: { select: publicTemplateSelect },
  events: {
    select: { id: true, kind: true, body: true, createdById: true, createdByName: true, at: true, ip: true, previousHash: true, chainSequence: true, hash: true },
    orderBy: { at: "asc" as const },
  },
} as const;

router.post(
  "/:id/sign",
  requireModule("consentimientos", "write"),
  requireRole("admin", "recepcion", "profesional", "esteticista"),
  async (req, res, next) => {
  try {
    const c = await prisma.consent.findUnique({
      where: { id: req.params.id },
      include: { template: true, patient: { include: { clinic: true } } },
    });
    if (!c) throw notFound("Consentimiento no encontrado");
    // Verifica que el consentimiento pertenece a un paciente de esta clínica
    if (c.patient.clinicId !== req.user!.clinicId) throw forbidden();
    if (c.status !== "pendiente") throw conflict("Este consentimiento ya no está pendiente de firma");
    const body = signSchema.parse(req.body);
    const capturingUser = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { fullName: true } });
    const signedAt = new Date();
    const patientName = c.patientName ?? `${c.patient.firstName} ${c.patient.lastName}`;
    const patientIdType = c.patientIdType ?? c.patient.idType;
    const patientIdNumber = c.patientIdNumber ?? c.patient.idNumber;
    const patientBirthDate = c.patientBirthDate ?? c.patient.birthDate;
    const clinicName = c.clinicName ?? c.patient.clinic.name;
    const clinicRuc = c.clinicRuc ?? c.patient.clinic.ruc;
    const templateTitle = c.templateTitle ?? c.template.title;
    const templateBody = c.templateBody ?? c.template.body;
    const templateKind = c.templateKind ?? c.template.kind;
    const templateVersion = c.templateVersion ?? c.template.version;
    const contentHash = consentContentHash({
      consentId: c.id,
      clinicId: c.patient.clinicId,
      clinicName,
      clinicRuc,
      patientId: c.patient.id,
      patientName,
      patientIdType,
      patientIdNumber,
      patientBirthDate,
      templateId: c.templateId,
      templateTitle,
      templateBody,
      templateKind,
      templateVersion,
      signedAt,
    });
    const signatureHash = sha256(body.signaturePath);
    const signedIp = req.ip ?? null;
    const finalPdf = await buildConsentPdf({
      clinic: { name: clinicName, ruc: clinicRuc, logoData: c.patient.clinic.logoData },
      patient: { name: patientName, idType: patientIdType, idNumber: patientIdNumber, birthDate: patientBirthDate },
      consent: {
        id: c.id,
        title: templateTitle,
        body: templateBody,
        kind: templateKind,
        version: templateVersion,
        signedAt,
        signedIp,
        signaturePath: body.signaturePath,
        contentHash,
        signatureHash,
      },
    });
    const pdfHash = sha256(finalPdf);
    const updated = await prisma.consent.update({
      where: { id: c.id },
      data: {
        status: "firmado",
        signedAt,
        signaturePath: body.signaturePath,
        signedIp,
        signedUserAgent: req.get("user-agent")?.slice(0, 500) ?? null,
        signedByUserId: req.user!.id,
        signedByUserName: capturingUser?.fullName ?? req.user!.email,
        patientName,
        patientIdType,
        patientIdNumber,
        patientBirthDate,
        clinicName,
        clinicRuc,
        templateTitle,
        templateBody,
        templateKind,
        templateVersion,
        contentHash,
        signatureHash,
        pdfHash,
        finalPdf,
      },
      select: publicConsentSelect,
    });
    const tipo = c.template?.kind === "imagen" ? "cesión de imagen" : "clínico";
    await audit(
      req,
      "Firmó consentimiento",
      "consentimiento",
      `${c.patient.firstName} ${c.patient.lastName} · ${tipo}`,
    );
    res.json(updated);
  } catch (e) {
    next(e);
  }
  },
);

const eventSchema = z.object({
  kind: z.enum(["adenda", "correccion", "revocacion"]),
  body: z.string().trim().min(10).max(10_000),
});

router.post(
  "/:id/events",
  requireModule("consentimientos", "write"),
  requireRole("admin", "profesional"),
  async (req, res, next) => {
    try {
      const input = eventSchema.parse(req.body);
      const consent = await prisma.consent.findUnique({
        where: { id: req.params.id },
        include: { patient: { select: { clinicId: true } }, events: { orderBy: { at: "desc" }, take: 1 } },
      });
      if (!consent) throw notFound("Consentimiento no encontrado");
      if (consent.patient.clinicId !== req.user!.clinicId) throw forbidden();
      if (!consent.signedAt || (consent.status !== "firmado" && consent.status !== "revocado")) {
        throw conflict("Solo se pueden agregar eventos a documentos firmados");
      }
      if (input.kind === "revocacion" && consent.status === "revocado") throw conflict("El consentimiento ya fue revocado");
      const user = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { fullName: true } });
      const at = new Date();
      const id = crypto.randomUUID();
      const event = await prisma.$transaction(async (tx) => {
        await tx.$queryRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${consent.id}))`);
        const latest = await tx.consentEvent.findFirst({ where: { consentId: consent.id }, orderBy: { chainSequence: "desc" } });
        const previousHash = latest?.hash ?? consent.contentHash ?? null;
        const chainSequence = (latest?.chainSequence ?? 0) + 1;
        const hash = sha256(JSON.stringify({
          id,
          consentId: consent.id,
          kind: input.kind,
          body: input.body,
          createdById: req.user!.id,
          createdByName: user?.fullName ?? req.user!.email,
          at: at.toISOString(),
          ip: req.ip ?? null,
          previousHash,
          chainSequence,
        }));
        const created = await tx.consentEvent.create({
          data: {
            id,
            consentId: consent.id,
            kind: input.kind,
            body: input.body,
            createdById: req.user!.id,
            createdByName: user?.fullName ?? req.user!.email,
            at,
            ip: req.ip ?? null,
            previousHash,
            chainSequence,
            hash,
          },
        });
        if (input.kind === "revocacion") {
          await tx.consent.update({
            where: { id: consent.id },
            data: {
              status: "revocado",
              revokedAt: at,
              revocationReason: input.body,
              revokedByUserId: req.user!.id,
            },
          });
        }
        return created;
      });
      await audit(req, input.kind === "revocacion" ? "Registró revocación de consentimiento" : "Agregó evento a consentimiento", "consentimiento", `${input.kind} · ${consent.id}`);
      res.status(201).json(event);
    } catch (e) {
      next(e);
    }
  },
);

router.get("/:id/pdf", requireModule("consentimientos"), async (req, res, next) => {
  try {
    const consent = await prisma.consent.findUnique({
      where: { id: req.params.id },
      include: {
        template: true,
        patient: { include: { clinic: { select: { name: true, ruc: true, logoData: true } } } },
      },
    });
    if (!consent) throw notFound("Consentimiento no encontrado");
    if (consent.patient.clinicId !== req.user!.clinicId) throw forbidden();
    const title = consent.templateTitle ?? consent.template?.title ?? "Consentimiento informado";
    const storedPdf = consent.finalPdf ? Buffer.from(consent.finalPdf) : null;
    if (storedPdf && consent.pdfHash && sha256(storedPdf) !== consent.pdfHash) {
      throw conflict("La verificación de integridad del PDF falló. Se bloqueó la descarga");
    }
    const generatedPdf = storedPdf ? null : await buildConsentPdf({
      clinic: consent.patient.clinic,
      patient: {
        name: consent.patientName ?? `${consent.patient.firstName} ${consent.patient.lastName}`,
        idType: consent.patientIdType ?? consent.patient.idType,
        idNumber: consent.patientIdNumber ?? consent.patient.idNumber,
        birthDate: consent.patientBirthDate ?? consent.patient.birthDate,
      },
      consent: {
        id: consent.id,
        title,
        body: consent.templateBody ?? consent.template?.body ?? "",
        kind: consent.templateKind ?? consent.template?.kind ?? "clinico",
        version: consent.templateVersion ?? consent.template?.version ?? null,
        signedAt: consent.signedAt,
        signedIp: consent.signedIp,
        signaturePath: consent.signaturePath,
        contentHash: consent.contentHash,
        signatureHash: consent.signatureHash,
      },
    });
    const pdf = storedPdf ?? generatedPdf;
    if (!pdf) throw notFound("PDF de consentimiento no disponible");
    const safeName = title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-|-$/g, "");
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${safeName || "consentimiento"}.pdf"`);
    res.setHeader("Content-Length", String(pdf.length));
    await audit(req, "Descargó consentimiento en PDF", "consentimiento", `${title} · ${consent.patient.firstName} ${consent.patient.lastName}`);
    res.send(pdf);
  } catch (e) {
    next(e);
  }
});

export default router;
