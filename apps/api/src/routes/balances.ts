import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth, requireModule } from "../middleware/auth.js";
import { audit } from "../lib/audit.js";
import { notFound } from "../lib/errors.js";

const router = Router();
router.use(requireAuth);

const abonoSchema = z.object({
  amount: z.number().positive(),
  method: z.string().default("efectivo"),
  note: z.string().optional(),
});

router.post("/:id/abonos", requireModule("paquetes", "write"), async (req, res, next) => {
  try {
    const bal = await prisma.packageBalance.findUnique({
      where: { id: req.params.id },
      include: { package: true, patient: true },
    });
    if (!bal) throw notFound("Bono no encontrado");
    const body = abonoSchema.parse(req.body);
    const pay = await prisma.packagePayment.create({
      data: {
        balanceId: bal.id,
        amount: body.amount,
        method: body.method,
        note: body.note ?? "",
      },
    });
    await audit(
      req,
      "Registró abono de paquete",
      "paquetes",
      `${bal.package.name} · $${body.amount.toFixed(2)} · ${bal.patient.firstName} ${bal.patient.lastName}`,
    );
    res.status(201).json(pay);
  } catch (e) {
    next(e);
  }
});

export default router;
