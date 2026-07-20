import { Router } from "express";
import {
  eachDayOfInterval,
  eachMonthOfInterval,
  eachWeekOfInterval,
  endOfDay,
  format,
  startOfDay,
  startOfWeek,
} from "date-fns";
import { prisma } from "../db.js";
import { requireAuth, requireModule, requireRole } from "../middleware/auth.js";
import { badRequest } from "../lib/errors.js";
import { audit } from "../lib/audit.js";

const router = Router();
router.use(requireAuth);

type PeriodBucket = { key: string; label: string; start: Date; end: Date };

function parseDashboardPeriod(query: Record<string, unknown>) {
  const today = new Date();
  const parse = (value: unknown, fallback: Date) => {
    if (value === undefined) return fallback;
    const text = String(value);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) throw badRequest("Fecha inválida; use AAAA-MM-DD");
    const date = new Date(`${text}T00:00:00`);
    if (Number.isNaN(date.valueOf())) throw badRequest("Fecha inválida");
    return date;
  };
  const from = startOfDay(parse(query.dateFrom, today));
  const to = endOfDay(parse(query.dateTo, today));
  if (from > to) throw badRequest("La fecha inicial no puede ser posterior a la final");
  if ((to.valueOf() - from.valueOf()) / 86_400_000 > 366) {
    throw badRequest("El rango máximo permitido es de 366 días");
  }
  return { from, to };
}

function buildBuckets(from: Date, to: Date): PeriodBucket[] {
  const days = Math.floor((endOfDay(to).valueOf() - startOfDay(from).valueOf()) / 86_400_000) + 1;
  if (days <= 7) {
    return eachDayOfInterval({ start: from, end: to }).map((start) => ({
      key: format(start, "yyyy-MM-dd"),
      label: new Intl.DateTimeFormat("es-EC", { day: "numeric", month: "short" }).format(start).replace(".", ""),
      start: startOfDay(start), end: endOfDay(start),
    }));
  }
  if (days <= 90) {
    return eachWeekOfInterval({ start: from, end: to }, { weekStartsOn: 1 }).map((weekStart) => {
      const start = weekStart < from ? from : weekStart;
      const end = endOfDay(new Date(Math.min(startOfWeek(weekStart, { weekStartsOn: 1 }).valueOf() + 6 * 86_400_000, to.valueOf())));
      return { key: format(startOfWeek(weekStart, { weekStartsOn: 1 }), "yyyy-MM-dd"), label: format(start, "d MMM").replace(".", ""), start, end };
    });
  }
  return eachMonthOfInterval({ start: from, end: to }).map((monthStart) => ({
    key: format(monthStart, "yyyy-MM"),
    label: new Intl.DateTimeFormat("es-EC", { month: "short", year: "2-digit" }).format(monthStart).replace(".", ""),
    start: monthStart < from ? from : monthStart,
    end: endOfDay(new Date(Math.min(new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).valueOf(), to.valueOf()))),
  }));
}

// KPIs del dashboard
router.get("/kpis", requireModule("reportes"), async (req, res, next) => {
  try {
    const cid = req.user!.clinicId;
    const { from, to } = parseDashboardPeriod(req.query);
    const buckets = buildBuckets(from, to);

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
        where: { clinicId: cid, startAt: { gte: from, lte: to } },
      }),
      prisma.invoice.aggregate({
        where: { clinicId: cid, status: "autorizada", date: { gte: from, lte: to } },
        _sum: { total: true },
      }),
      prisma.patient.count({ where: { clinicId: cid, createdAt: { gte: from, lte: to } } }),
      prisma.inventoryItem.findMany({
        where: { clinicId: cid },
        select: { stock: true, minStock: true },
      }),
      prisma.invoice.findMany({
        where: { clinicId: cid, status: "autorizada", date: { gte: from, lte: to } },
        select: { date: true, total: true },
      }),
      prisma.patient.findMany({
        where: { clinicId: cid, createdAt: { gte: from, lte: to } },
        select: { createdAt: true },
      }),
      prisma.appointment.groupBy({
        by: ["status"],
        where: { clinicId: cid, startAt: { gte: from, lte: to } },
        _count: { _all: true },
      }),
      prisma.procedure.findMany({
        where: { date: { gte: from, lte: to }, service: { clinicId: cid } },
        select: { service: { select: { name: true } } },
      }),
    ]);

    const alertas = inventario.filter((i) => Number(i.stock) <= Number(i.minStock)).length;
    const ingresosPorMes = buckets.map((bucket) => ({
      label: bucket.label,
      value: monthlyInvoices
        .filter((inv) => inv.date >= bucket.start && inv.date <= bucket.end)
        .reduce((sum, inv) => sum + Number(inv.total), 0),
    }));
    const pacientesNuevosPorMes = buckets.map((bucket) => ({
      label: bucket.label,
      value: monthlyPatients.filter((p) => p.createdAt >= bucket.start && p.createdAt <= bucket.end).length,
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
      period: { from: format(from, "yyyy-MM-dd"), to: format(to, "yyyy-MM-dd") },
    });
  } catch (e) {
    next(e);
  }
});

// Registra que un administrador abrió una vista previa para compartir. El envío real
// se habilitará únicamente al configurar un canal transaccional por clínica.
router.post("/reports/operational/share-preview", requireModule("reportes"), requireRole("admin"), async (req, res, next) => {
  try {
    const { from, to } = parseDashboardPeriod(req.body ?? {});
    await audit(req, "reporte_vista_previa_compartir", "sistema", `${format(from, "yyyy-MM-dd")} a ${format(to, "yyyy-MM-dd")}`);
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

router.post("/reports/operational/export", requireModule("reportes"), requireRole("admin"), async (req, res, next) => {
  try {
    const { from, to } = parseDashboardPeriod(req.body ?? {});
    await audit(req, "reporte_operativo_exportado", "sistema", `${format(from, "yyyy-MM-dd")} a ${format(to, "yyyy-MM-dd")}`);
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

router.get("/report-notes", requireModule("reportes"), async (req, res, next) => {
  try {
    const list = await prisma.reportNote.findMany({
      where: { clinicId: req.user!.clinicId },
      include: { createdBy: { select: { fullName: true } } },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 50,
    });
    res.json(list.map((note) => ({
      id: note.id,
      title: note.title,
      body: note.body,
      metricKey: note.metricKey,
      periodFrom: note.periodFrom ? format(note.periodFrom, "yyyy-MM-dd") : null,
      periodTo: note.periodTo ? format(note.periodTo, "yyyy-MM-dd") : null,
      status: note.status,
      createdAt: note.createdAt,
      resolvedAt: note.resolvedAt,
      createdByName: note.createdBy.fullName,
    })));
  } catch (e) {
    next(e);
  }
});

router.post("/report-notes", requireModule("reportes"), requireRole("admin"), async (req, res, next) => {
  try {
    const title = String(req.body?.title ?? "").trim();
    const body = String(req.body?.body ?? "").trim();
    if (!title || title.length > 140 || body.length > 2_000) throw badRequest("La nota debe tener título y un contenido válido");
    const { from, to } = parseDashboardPeriod(req.body ?? {});
    const note = await prisma.reportNote.create({
      data: {
        clinicId: req.user!.clinicId,
        createdById: req.user!.id,
        title,
        body: body || null,
        metricKey: typeof req.body?.metricKey === "string" ? req.body.metricKey.slice(0, 80) : null,
        periodFrom: from,
        periodTo: to,
      },
      include: { createdBy: { select: { fullName: true } } },
    });
    await audit(req, "nota_operativa_creada", "sistema", title);
    res.status(201).json({ ...note, createdByName: note.createdBy.fullName });
  } catch (e) {
    next(e);
  }
});

router.patch("/report-notes/:id", requireModule("reportes"), requireRole("admin"), async (req, res, next) => {
  try {
    const status = req.body?.status;
    if (status !== "abierta" && status !== "resuelta") throw badRequest("Estado de nota inválido");
    const found = await prisma.reportNote.findFirst({ where: { id: req.params.id, clinicId: req.user!.clinicId } });
    if (!found) throw badRequest("Nota no encontrada");
    const note = await prisma.reportNote.update({
      where: { id: found.id },
      data: { status, resolvedAt: status === "resuelta" ? new Date() : null },
    });
    await audit(req, "nota_operativa_actualizada", "sistema", `${note.title}: ${status}`);
    res.json(note);
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
      where: {
        clinicId: req.user!.clinicId,
        status: "aprobada",
        ...(req.user!.role === "admin" ? {} : { allowedRoles: { has: req.user!.role } }),
      },
      select: {
        id: true,
        kind: true,
        title: true,
        procedureType: true,
        body: true,
        status: true,
        seriesId: true,
        version: true,
        approvedAt: true,
        allowedRoles: true,
      },
      orderBy: { title: "asc" },
    });
    res.json(list);
  } catch (e) {
    next(e);
  }
});

export default router;
