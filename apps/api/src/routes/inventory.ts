import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth, requireModule } from "../middleware/auth.js";
import { audit } from "../lib/audit.js";
import { forbidden, notFound } from "../lib/errors.js";

const router = Router();
router.use(requireAuth, requireModule("inventario"));

router.get("/", async (req, res, next) => {
  try {
    const list = await prisma.inventoryItem.findMany({
      where: { clinicId: req.user!.clinicId },
      orderBy: { name: "asc" },
    });
    res.json(list);
  } catch (e) {
    next(e);
  }
});

const newItemSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["vial", "principio_activo", "insumo", "farmaco"]),
  unit: z.string().min(1),
  stock: z.number().nonnegative().default(0),
  minStock: z.number().nonnegative().default(0),
  lotNumber: z.string().optional(),
  expiryDate: z.string().optional(),
});

router.post("/", requireModule("inventario", "write"), async (req, res, next) => {
  try {
    const b = newItemSchema.parse(req.body);
    const item = await prisma.inventoryItem.create({
      data: {
        clinicId: req.user!.clinicId,
        name: b.name,
        type: b.type,
        unit: b.unit,
        stock: b.stock,
        minStock: b.minStock,
        lotNumber: b.lotNumber ?? null,
        expiryDate: b.expiryDate ? new Date(b.expiryDate) : null,
      },
    });
    await audit(req, "Creó ítem de inventario", "sistema", item.name);
    res.status(201).json(item);
  } catch (e) {
    next(e);
  }
});

const editItemSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.enum(["vial", "principio_activo", "insumo", "farmaco"]).optional(),
  unit: z.string().min(1).optional(),
  minStock: z.number().nonnegative().optional(),
  lotNumber: z.string().nullable().optional(),
  expiryDate: z.string().nullable().optional(),
});

router.patch("/:id", requireModule("inventario", "write"), async (req, res, next) => {
  try {
    const cur = await prisma.inventoryItem.findFirst({
      where: { id: req.params.id, clinicId: req.user!.clinicId },
    });
    if (!cur) throw notFound("Ítem no encontrado");
    const b = editItemSchema.parse(req.body);
    const item = await prisma.inventoryItem.update({
      where: { id: cur.id },
      data: {
        name: b.name ?? cur.name,
        type: b.type ?? cur.type,
        unit: b.unit ?? cur.unit,
        minStock: b.minStock ?? cur.minStock,
        lotNumber: b.lotNumber !== undefined ? (b.lotNumber ?? null) : cur.lotNumber,
        expiryDate:
          b.expiryDate !== undefined
            ? b.expiryDate
              ? new Date(b.expiryDate)
              : null
            : cur.expiryDate,
      },
    });
    await audit(req, "Actualizó ítem de inventario", "sistema", item.name);
    res.json(item);
  } catch (e) {
    next(e);
  }
});

router.delete("/:id", requireModule("inventario", "write"), async (req, res, next) => {
  try {
    const cur = await prisma.inventoryItem.findFirst({
      where: { id: req.params.id, clinicId: req.user!.clinicId },
    });
    if (!cur) throw notFound("Ítem no encontrado");
    await prisma.inventoryItem.delete({ where: { id: cur.id } });
    await audit(req, "Eliminó ítem de inventario", "sistema", cur.name);
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

const adjustSchema = z.object({ delta: z.number() });

router.patch("/:id/adjust", requireModule("inventario", "consume"), async (req, res, next) => {
  try {
    const cur = await prisma.inventoryItem.findFirst({
      where: { id: req.params.id, clinicId: req.user!.clinicId },
    });
    if (!cur) throw notFound("Ítem no encontrado");
    const { delta } = adjustSchema.parse(req.body);
    if (req.user!.role !== "admin" && delta > 0) {
      throw forbidden("Solo un administrador puede reponer inventario");
    }
    const newStock = Math.max(0, Number(cur.stock) + delta);
    const item = await prisma.inventoryItem.update({
      where: { id: cur.id },
      data: { stock: newStock },
    });
    await audit(
      req,
      delta >= 0 ? "Repuso inventario" : "Consumió inventario",
      "sistema",
      `${item.name} · ${delta >= 0 ? "+" : ""}${delta} ${item.unit}`,
    );
    res.json(item);
  } catch (e) {
    next(e);
  }
});

export default router;
