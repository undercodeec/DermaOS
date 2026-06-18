import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth, requireModule } from "../middleware/auth.js";
import { audit } from "../lib/audit.js";
import { notFound } from "../lib/errors.js";

const router = Router();
router.use(requireAuth, requireModule("paquetes"));

// Catálogo de paquetes. ?active=1 filtra solo los activos (uso para Vender).
router.get("/", async (req, res, next) => {
  try {
    const onlyActive = req.query.active === "1";
    const list = await prisma.package.findMany({
      where: onlyActive ? { active: true } : undefined,
      include: { service: { select: { id: true, name: true, price: true } } },
      orderBy: { name: "asc" },
    });
    res.json(list);
  } catch (e) {
    next(e);
  }
});

// Todos los bonos vendidos (para vista global)
router.get("/balances", async (_req, res, next) => {
  try {
    const list = await prisma.packageBalance.findMany({
      include: {
        package: true,
        payments: { select: { amount: true } },
        patient: { select: { id: true, firstName: true, lastName: true, idNumber: true } },
      },
      orderBy: { soldAt: "desc" },
    });
    res.json(list);
  } catch (e) {
    next(e);
  }
});

const newPackageSchema = z.object({
  name: z.string().min(1),
  serviceId: z.string().uuid(),
  sessions: z.number().int().positive(),
  price: z.number().positive(),
  intervalDays: z.number().int().positive().default(30),
  validityDays: z.number().int().positive().default(180),
});

router.post("/", requireModule("paquetes", "write"), async (req, res, next) => {
  try {
    const b = newPackageSchema.parse(req.body);
    const pk = await prisma.package.create({
      data: {
        name: b.name,
        serviceId: b.serviceId,
        sessions: b.sessions,
        price: b.price,
        intervalDays: b.intervalDays,
        validityDays: b.validityDays,
        active: true,
      },
      include: { service: { select: { id: true, name: true, price: true } } },
    });
    await audit(req, "Creó paquete", "paquetes", pk.name);
    res.status(201).json(pk);
  } catch (e) {
    next(e);
  }
});

const editPackageSchema = newPackageSchema.partial().extend({ active: z.boolean().optional() });

router.patch("/:id", requireModule("paquetes", "write"), async (req, res, next) => {
  try {
    const cur = await prisma.package.findUnique({ where: { id: req.params.id } });
    if (!cur) throw notFound("Paquete no encontrado");
    const b = editPackageSchema.parse(req.body);
    const pk = await prisma.package.update({
      where: { id: cur.id },
      data: {
        name: b.name ?? cur.name,
        serviceId: b.serviceId ?? cur.serviceId,
        sessions: b.sessions ?? cur.sessions,
        price: b.price ?? cur.price,
        intervalDays: b.intervalDays ?? cur.intervalDays,
        validityDays: b.validityDays ?? cur.validityDays,
        active: b.active ?? cur.active,
      },
      include: { service: { select: { id: true, name: true, price: true } } },
    });
    await audit(req, "Actualizó paquete", "paquetes", pk.name);
    res.json(pk);
  } catch (e) {
    next(e);
  }
});

export default router;
