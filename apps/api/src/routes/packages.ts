import { Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../db.js";
import { requireAuth, requireModule } from "../middleware/auth.js";
import { audit } from "../lib/audit.js";
import { conflict, notFound } from "../lib/errors.js";

const router = Router();
router.use(requireAuth, requireModule("paquetes"));

router.get("/", async (req, res, next) => {
  try {
    const onlyActive = req.query.active === "1";
    const list = await prisma.package.findMany({
      where: {
        clinicId: req.user!.clinicId,
        ...(onlyActive ? { active: true } : {}),
      },
      include: { service: { select: { id: true, name: true, price: true } } },
      orderBy: { name: "asc" },
    });
    res.json(list);
  } catch (e) {
    next(e);
  }
});

// Todos los bonos vendidos (para vista global)
router.get("/balances", async (req, res, next) => {
  try {
    const list = await prisma.packageBalance.findMany({
      where: { clinicId: req.user!.clinicId },
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
    const svc = await prisma.service.findFirst({ where: { id: b.serviceId, clinicId: req.user!.clinicId } });
    if (!svc) throw notFound("Servicio no encontrado");
    const pk = await prisma.package.create({
      data: {
        clinicId: req.user!.clinicId,
        name: b.name,
        serviceId: svc.id,
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
    const cur = await prisma.package.findFirst({
      where: { id: req.params.id, clinicId: req.user!.clinicId },
    });
    if (!cur) throw notFound("Paquete no encontrado");
    const b = editPackageSchema.parse(req.body);
    const changesService = Boolean(b.serviceId && b.serviceId !== cur.serviceId);
    if (changesService) {
      const svc = await prisma.service.findFirst({ where: { id: b.serviceId, clinicId: req.user!.clinicId } });
      if (!svc) throw notFound("Servicio no encontrado");
    }
    const pk = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw(
        Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${`package:${cur.id}`}))`,
      );
      if (changesService) {
        const sold = await tx.packageBalance.count({ where: { packageId: cur.id } });
        if (sold > 0) {
          throw conflict("No se puede cambiar el servicio de un paquete que ya fue vendido; crea uno nuevo");
        }
      }
      return tx.package.update({
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
    });
    await audit(req, "Actualizó paquete", "paquetes", pk.name);
    res.json(pk);
  } catch (e) {
    next(e);
  }
});

export default router;
