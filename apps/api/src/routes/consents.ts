import { Router } from "express";
import { prisma } from "../db.js";
import { requireAuth, requireModule } from "../middleware/auth.js";
import { audit } from "../lib/audit.js";
import { notFound } from "../lib/errors.js";

const router = Router();
router.use(requireAuth);

// Firma el consentimiento. La firma se guarda como signaturePath (placeholder de demo).
router.post("/:id/sign", requireModule("consentimientos", "write"), async (req, res, next) => {
  try {
    const c = await prisma.consent.findUnique({
      where: { id: req.params.id },
      include: { template: true, patient: true },
    });
    if (!c) throw notFound("Consentimiento no encontrado");
    const updated = await prisma.consent.update({
      where: { id: c.id },
      data: {
        status: "firmado",
        signedAt: new Date(),
        signaturePath: typeof req.body?.signaturePath === "string" ? req.body.signaturePath : "manuscrita-demo",
      },
      include: { template: true },
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

export default router;
