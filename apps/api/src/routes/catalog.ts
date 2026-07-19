import { Router } from "express";
import { startOfMonth, endOfMonth, startOfDay, endOfDay, subMonths } from "date-fns";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

// KPIs del dashboard
router.get("/kpis", async (req, res, next) => {
  try {
    const now = new Date();
    const cid = req.user!.clinicId;
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const chartStart = startOfMonth(subMonths(now, 5));
    const chartEnd = monthEnd;
    const monthKeys = Array.from({ length: 6 }, (_, i) => {
      const d = subMonths(now, 5 - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = new Intl.DateTimeFormat("es-EC", { month: "short" }).format(d).replace(".", "");
      return { key, label: label.charAt(0).toUpperCase() + label.slice(1) };
    });

    const [
      citasHoy,
      ingresosRes,
      pacientes,
      inventario,
      monthlyInvoices,
      monthlyPatients,
      appointmentsByStatus,
      serviceProcedures,
    ] = await Promise.all([
      prisma.appointment.count({
        where: { clinicId: cid, startAt: { gte: startOfDay(now), lte: endOfDay(now) } },
      }),
      prisma.invoice.aggregate({
        where: { clinicId: cid, status: "autorizada", date: { gte: monthStart, lte: monthEnd } },
        _sum: { total: true },
      }),
      prisma.patient.count({ where: { clinicId: cid } }),
      prisma.inventoryItem.findMany({
        where: { clinicId: cid },
        select: { stock: true, minStock: true },
      }),
      prisma.invoice.findMany({
        where: { clinicId: cid, status: "autorizada", date: { gte: chartStart, lte: chartEnd } },
        select: { date: true, total: true },
      }),
      prisma.patient.findMany({
        where: { clinicId: cid, createdAt: { gte: chartStart, lte: chartEnd } },
        select: { createdAt: true },
      }),
      prisma.appointment.groupBy({
        by: ["status"],
        where: { clinicId: cid, startAt: { gte: monthStart, lte: monthEnd } },
        _count: { _all: true },
      }),
      prisma.procedure.findMany({
        where: { date: { gte: chartStart, lte: chartEnd }, service: { clinicId: cid } },
        select: { service: { select: { name: true } } },
      }),
    ]);

    const alertas = inventario.filter((i) => Number(i.stock) <= Number(i.minStock)).length;
    const ingresosPorMes = monthKeys.map((m) => ({
      label: m.label,
      value: monthlyInvoices
        .filter((inv) => `${inv.date.getFullYear()}-${String(inv.date.getMonth() + 1).padStart(2, "0")}` === m.key)
        .reduce((sum, inv) => sum + Number(inv.total), 0),
    }));
    const pacientesNuevosPorMes = monthKeys.map((m) => ({
      label: m.label,
      value: monthlyPatients.filter(
        (p) => `${p.createdAt.getFullYear()}-${String(p.createdAt.getMonth() + 1).padStart(2, "0")}` === m.key,
      ).length,
    }));
    const citasPorEstado = appointmentsByStatus.map((row) => ({
      label: row.status,
      value: row._count._all,
    }));
    const serviceCounts = serviceProcedures.reduce<Record<string, number>>((acc, p) => {
      acc[p.service.name] = (acc[p.service.name] ?? 0) + 1;
      return acc;
    }, {});
    const serviciosMasVendidos = Object.entries(serviceCounts)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    res.json({
      citasHoy,
      ingresos: Number(ingresosRes._sum.total ?? 0),
      pacientes,
      alertas,
      charts: {
        ingresosPorMes,
        citasPorEstado,
        serviciosMasVendidos,
        pacientesNuevosPorMes,
      },
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
