import { Router } from "express";
import { startOfMonth, endOfMonth, startOfDay, endOfDay } from "date-fns";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

// KPIs del dashboard
router.get("/kpis", async (_req, res, next) => {
  try {
    const now = new Date();
    const [citasHoy, ingresosRes, pacientes, inventario] = await Promise.all([
      prisma.appointment.count({
        where: { startAt: { gte: startOfDay(now), lte: endOfDay(now) } },
      }),
      prisma.invoice.aggregate({
        where: { status: "autorizada", date: { gte: startOfMonth(now), lte: endOfMonth(now) } },
        _sum: { total: true },
      }),
      prisma.patient.count(),
      prisma.inventoryItem.findMany({ select: { stock: true, minStock: true } }),
    ]);
    const alertas = inventario.filter((i) => Number(i.stock) <= Number(i.minStock)).length;
    res.json({
      citasHoy,
      ingresos: Number(ingresosRes._sum.total ?? 0),
      pacientes,
      alertas,
    });
  } catch (e) {
    next(e);
  }
});

// Búsqueda global de pacientes (header)
router.get("/search/patients", async (req, res, next) => {
  try {
    const q = String(req.query.q ?? "").trim();
    if (q.length < 2) return res.json([]);
    const list = await prisma.patient.findMany({
      where: {
        OR: [
          { firstName: { contains: q, mode: "insensitive" } },
          { lastName: { contains: q, mode: "insensitive" } },
          { idNumber: { contains: q } },
        ],
      },
      select: { id: true, firstName: true, lastName: true, idNumber: true },
      take: 6,
    });
    res.json(
      list.map((p) => ({
        id: p.id,
        first_name: p.firstName,
        last_name: p.lastName,
        id_number: p.idNumber,
      })),
    );
  } catch (e) {
    next(e);
  }
});

// Catálogo de profesionales
router.get("/professionals", async (_req, res, next) => {
  try {
    const list = await prisma.professional.findMany({ orderBy: { name: "asc" } });
    res.json(list);
  } catch (e) {
    next(e);
  }
});

// Catálogo de plantillas de consentimiento
router.get("/consent-templates", async (_req, res, next) => {
  try {
    const list = await prisma.consentTemplate.findMany({ orderBy: { title: "asc" } });
    res.json(list);
  } catch (e) {
    next(e);
  }
});

export default router;
