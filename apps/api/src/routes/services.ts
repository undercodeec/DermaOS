import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth, requireModule } from "../middleware/auth.js";
import { audit } from "../lib/audit.js";
import { notFound } from "../lib/errors.js";

const router = Router();
router.use(requireAuth, requireModule("servicios"));

router.get("/", async (req, res, next) => {
  try {
    const onlyActive = req.query.active === "1";
    const list = await prisma.service.findMany({
      where: onlyActive ? { active: true } : undefined,
      orderBy: { name: "asc" },
    });
    res.json(list);
  } catch (e) {
    next(e);
  }
});

const baseSchema = {
  name: z.string().min(1),
  category: z.enum(["consulta", "tratamiento", "procedimiento_estetico", "estudio"]),
  durationMin: z.number().int().positive(),
  price: z.number().nonnegative(),
  vatRate: z.union([z.literal(0), z.literal(15)]),
  active: z.boolean().optional(),
};
const newSchema = z.object(baseSchema);
const editSchema = z.object({
  name: baseSchema.name.optional(),
  category: baseSchema.category.optional(),
  durationMin: baseSchema.durationMin.optional(),
  price: baseSchema.price.optional(),
  vatRate: baseSchema.vatRate.optional(),
  active: z.boolean().optional(),
});

router.post("/", requireModule("servicios", "write"), async (req, res, next) => {
  try {
    const b = newSchema.parse(req.body);
    // Estéticos siempre IVA 15
    const vatRate = b.category === "procedimiento_estetico" ? 15 : b.vatRate;
    const s = await prisma.service.create({
      data: {
        name: b.name,
        category: b.category,
        durationMin: b.durationMin,
        price: b.price,
        vatRate,
        active: b.active ?? true,
      },
    });
    await audit(req, "Creó servicio", "sistema", s.name);
    res.status(201).json(s);
  } catch (e) {
    next(e);
  }
});

router.patch("/:id", requireModule("servicios", "write"), async (req, res, next) => {
  try {
    const cur = await prisma.service.findUnique({ where: { id: req.params.id } });
    if (!cur) throw notFound("Servicio no encontrado");
    const b = editSchema.parse(req.body);
    const category = b.category ?? cur.category;
    const vatRate = category === "procedimiento_estetico" ? 15 : b.vatRate ?? cur.vatRate;
    const s = await prisma.service.update({
      where: { id: cur.id },
      data: {
        name: b.name ?? cur.name,
        category,
        durationMin: b.durationMin ?? cur.durationMin,
        price: b.price ?? cur.price,
        vatRate,
        active: b.active ?? cur.active,
      },
    });
    await audit(req, "Actualizó servicio", "sistema", s.name);
    res.json(s);
  } catch (e) {
    next(e);
  }
});

export default router;
