import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth, requireModule } from "../middleware/auth.js";
import { audit } from "../lib/audit.js";
import { conflict, forbidden, notFound } from "../lib/errors.js";
import { buildConsentPdf } from "../lib/consent-documents.js";

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
} as const;

const signSchema = z.object({
  accepted: z.literal(true),
  signaturePath: z.string().max(1_800_000).regex(/^data:image\/png;base64,[A-Za-z0-9+/=]+$/, "Firma inválida"),
});

router.post("/:id/sign", requireModule("consentimientos", "write"), async (req, res, next) => {
  try {
    const c = await prisma.consent.findUnique({
      where: { id: req.params.id },
      include: { template: true, patient: true },
    });
    if (!c) throw notFound("Consentimiento no encontrado");
    // Verifica que el consentimiento pertenece a un paciente de esta clínica
    if (c.patient.clinicId !== req.user!.clinicId) throw forbidden();
    if (c.status !== "pendiente") throw conflict("Este consentimiento ya no está pendiente de firma");
    const body = signSchema.parse(req.body);
    const updated = await prisma.consent.update({
      where: { id: c.id },
      data: {
        status: "firmado",
        signedAt: new Date(),
        signaturePath: body.signaturePath,
        signedIp: req.ip ?? null,
      },
      include: { template: { select: publicTemplateSelect } },
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
});

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
    const pdf = await buildConsentPdf({
      clinic: consent.patient.clinic,
      patient: consent.patient,
      consent: {
        id: consent.id,
        title,
        body: consent.templateBody ?? consent.template?.body ?? "",
        kind: consent.templateKind ?? consent.template?.kind ?? "clinico",
        version: consent.templateVersion ?? consent.template?.version ?? null,
        signedAt: consent.signedAt,
        signedIp: consent.signedIp,
        signaturePath: consent.signaturePath,
      },
    });
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
