import { Router } from "express";
import { startOfMonth, endOfMonth, startOfDay, endOfDay } from "date-fns";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

// KPIs del dashboard
router.get("/kpis", async (req, res, next) => {
  try {
    const now = new Date();
    const cid = req.user!.clinicId;
    const [citasHoy, ingresosRes, pacientes, inventario] = await Promise.all([
      prisma.appointment.count({
        where: { clinicId: cid, startAt: { gte: startOfDay(now), lte: endOfDay(now) } },
      }),
      prisma.invoice.aggregate({
        where: { clinicId: cid, status: "autorizada", date: { gte: startOfMonth(now), lte: endOfMonth(now) } },
        _sum: { total: true },
      }),
      prisma.patient.count({ where: { clinicId: cid } }),
      prisma.inventoryItem.findMany({
        where: { clinicId: cid },
        select: { stock: true, minStock: true },
      }),
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
        clinicId: req.user!.clinicId,
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
router.get("/professionals", async (req, res, next) => {
  try {
    const list = await prisma.professional.findMany({
      where: { clinicId: req.user!.clinicId },
      orderBy: { name: "asc" },
    });
    res.json(list);
  } catch (e) {
    next(e);
  }
});

// Catálogo de plantillas de consentimiento
router.get("/consent-templates", async (req, res, next) => {
  try {
    const list = await prisma.consentTemplate.findMany({
      where: { clinicId: req.user!.clinicId },
      orderBy: { title: "asc" },
    });
    res.json(list);
  } catch (e) {
    next(e);
  }
});

export default router;
