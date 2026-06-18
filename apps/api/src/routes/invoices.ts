import { Router } from "express";
import { prisma } from "../db.js";
import { requireAuth, requireModule } from "../middleware/auth.js";
import { audit } from "../lib/audit.js";
import { badRequest, notFound } from "../lib/errors.js";

const router = Router();
router.use(requireAuth, requireModule("facturacion"));

router.get("/", async (req, res, next) => {
  try {
    const { status, patientId } = req.query as Record<string, string>;
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (patientId) where.patientId = patientId;
    const list = await prisma.invoice.findMany({
      where,
      include: {
        patient: { select: { firstName: true, lastName: true, idNumber: true } },
      },
      orderBy: { date: "desc" },
    });
    res.json(
      list.map((i) => ({
        id: i.id,
        number: i.number,
        patientId: i.patientId,
        customerName: i.customerName,
        date: i.date.toISOString(),
        lines: i.lines,
        subtotal0: String(i.subtotal0),
        subtotal15: String(i.subtotal15),
        vatAmount: String(i.vatAmount),
        total: String(i.total),
        accessKey: i.accessKey,
        status: i.status,
        patient: i.patient
          ? {
              firstName: i.patient.firstName,
              lastName: i.patient.lastName,
              idNumber: i.patient.idNumber,
            }
          : null,
      })),
    );
  } catch (e) {
    next(e);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const inv = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: {
        patient: { select: { firstName: true, lastName: true, idNumber: true, email: true, phone: true } },
      },
    });
    if (!inv) throw notFound("Factura no encontrada");
    res.json({
      ...inv,
      date: inv.date.toISOString(),
      subtotal0: String(inv.subtotal0),
      subtotal15: String(inv.subtotal15),
      vatAmount: String(inv.vatAmount),
      total: String(inv.total),
    });
  } catch (e) {
    next(e);
  }
});

const FLOW = ["borrador", "generada", "firmada", "autorizada"] as const;

router.patch("/:id/advance", requireModule("facturacion", "write"), async (req, res, next) => {
  try {
    const cur = await prisma.invoice.findUnique({ where: { id: req.params.id } });
    if (!cur) throw notFound("Factura no encontrada");
    const idx = FLOW.indexOf(cur.status as (typeof FLOW)[number]);
    if (idx < 0 || idx >= FLOW.length - 1) {
      throw badRequest(`La factura ya está en estado ${cur.status}`);
    }
    const next = FLOW[idx + 1];
    const updated = await prisma.invoice.update({
      where: { id: cur.id },
      data: { status: next },
    });
    await audit(req, `Avanzó factura → ${next}`, "facturacion", `Factura ${cur.number}`);
    res.json({
      ...updated,
      date: updated.date.toISOString(),
      subtotal0: String(updated.subtotal0),
      subtotal15: String(updated.subtotal15),
      vatAmount: String(updated.vatAmount),
      total: String(updated.total),
    });
  } catch (e) {
    next(e);
  }
});

export default router;
