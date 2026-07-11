import { Router } from "express";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "../db.js";
import { requireAuth, requireModule } from "../middleware/auth.js";
import { audit } from "../lib/audit.js";
import { badRequest, conflict, notFound } from "../lib/errors.js";
import { calcInvoiceTotals, nextInvoiceNumber, sriAccessKey, EMISOR_RUC } from "../lib/sri.js";

const router = Router();
router.use(requireAuth, requireModule("pacientes"));

// Garantiza que el paciente :id pertenece a la clínica del usuario en sesión.
// Protege todos los sub-recursos de /:id sin repetir código en cada handler.
router.param("id", async (req, _res, next, id) => {
  try {
    const exists = await prisma.patient.count({
      where: { id, clinicId: req.user!.clinicId },
    });
    if (!exists) return next(notFound("Paciente no encontrado"));
    next();
  } catch (e) {
    next(e);
  }
});

const backgroundSchema = z.object({
  skinType: z.enum(["I", "II", "III", "IV", "V", "VI"]),
  usesSunscreen: z.boolean(),
  sunscreenSpf: z.number().optional(),
  allergies: z.array(z.string()),
  chronicConditions: z.array(z.string()),
  currentMedications: z.array(z.string()),
  familyHistory: z.array(z.string()),
  dermatologicalHistory: z.array(z.string()),
  smoker: z.boolean(),
  notes: z.string().optional(),
});

const newPatientSchema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  id_type: z.string().default("cedula"),
  id_number: z.string().min(1),
  birth_date: z.string(),
  sex: z.enum(["F", "M", "O"]),
  email: z.string().email().nullish(),
  phone: z.string().nullish(),
  city: z.string().nullish(),
  background: backgroundSchema,
});

router.get("/", async (req, res, next) => {
  try {
    const q = String(req.query.q ?? "").trim();
    const where: Prisma.PatientWhereInput = {
      clinicId: req.user!.clinicId,
      ...(q
        ? {
            OR: [
              { firstName: { contains: q, mode: "insensitive" } },
              { lastName:  { contains: q, mode: "insensitive" } },
              { idNumber:  { contains: q } },
            ],
          }
        : {}),
    };
    const list = await prisma.patient.findMany({ where, orderBy: { createdAt: "desc" } });
    res.json(list.map(serializePatient));
  } catch (e) {
    next(e);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const p = await prisma.patient.findUnique({ where: { id: req.params.id } });
    if (!p) throw notFound("Paciente no encontrado");
    res.json(serializePatient(p));
  } catch (e) {
    next(e);
  }
});

router.get("/:id/counts", async (req, res, next) => {
  try {
    const id = req.params.id;
    const [evolucion, recetas, fotos, consentimientos, procedimientos, paquetes, facturas] = await Promise.all([
      prisma.clinicalRecord.count({ where: { patientId: id, type: "evolucion" } }),
      prisma.clinicalRecord.count({ where: { patientId: id, type: "receta" } }),
      prisma.photo.count({ where: { patientId: id } }),
      prisma.consent.count({ where: { patientId: id } }),
      prisma.procedure.count({ where: { patientId: id } }),
      prisma.packageBalance.count({ where: { patientId: id } }),
      prisma.invoice.count({ where: { patientId: id } }),
    ]);
    res.json({ evolucion, recetas, fotos, consentimientos, procedimientos, paquetes, facturas });
  } catch (e) {
    next(e);
  }
});

router.post("/", requireModule("pacientes", "write"), async (req, res, next) => {
  try {
    const body = newPatientSchema.parse(req.body);
    const p = await prisma.patient.create({
      data: {
        clinicId: req.user!.clinicId,
        firstName: body.first_name,
        lastName: body.last_name,
        idType: body.id_type,
        idNumber: body.id_number,
        birthDate: new Date(body.birth_date),
        sex: body.sex,
        email: body.email ?? null,
        phone: body.phone ?? null,
        city: body.city ?? null,
        background: body.background,
      },
    });
    await audit(req, "Creó paciente", "sistema", `${p.firstName} ${p.lastName}`);
    res.status(201).json(serializePatient(p));
  } catch (e) {
    next(e);
  }
});

// ----- Evolución (SOAP) -----
router.get("/:id/evolucion", async (req, res, next) => {
  try {
    const list = await prisma.clinicalRecord.findMany({
      where: { patientId: req.params.id, type: "evolucion" },
      include: { professional: { select: { id: true, name: true } } },
      orderBy: { date: "desc" },
    });
    res.json(list);
  } catch (e) {
    next(e);
  }
});

const newEvolucionSchema = z.object({
  professionalId: z.string().uuid(),
  subjective: z.string().min(1),
  objective: z.string().min(1),
  assessment: z.string().min(1),
  plan: z.string().min(1),
  cie10Codes: z.array(z.string()).default([]),
});
router.post("/:id/evolucion", requireModule("historia", "write"), async (req, res, next) => {
  try {
    const pat = await prisma.patient.findUnique({ where: { id: req.params.id } });
    if (!pat) throw notFound("Paciente no encontrado");
    const body = newEvolucionSchema.parse(req.body);
    const r = await prisma.clinicalRecord.create({
      data: {
        patientId: pat.id,
        professionalId: body.professionalId,
        type: "evolucion",
        date: new Date(),
        subjective: body.subjective,
        objective: body.objective,
        assessment: body.assessment,
        plan: body.plan,
        cie10Codes: body.cie10Codes,
      },
      include: { professional: { select: { id: true, name: true } } },
    });
    await audit(req, "Registró evolución", "historia", `${pat.firstName} ${pat.lastName}`);
    res.status(201).json(r);
  } catch (e) {
    next(e);
  }
});

const updEvolucionSchema = newEvolucionSchema.partial();
router.patch("/:id/evolucion/:rid", requireModule("historia", "write"), async (req, res, next) => {
  try {
    const cur = await prisma.clinicalRecord.findUnique({ where: { id: req.params.rid } });
    if (!cur || cur.patientId !== req.params.id || cur.type !== "evolucion") throw notFound("Evolución no encontrada");
    const body = updEvolucionSchema.parse(req.body);
    const r = await prisma.clinicalRecord.update({
      where: { id: cur.id },
      data: {
        ...(body.professionalId ? { professionalId: body.professionalId } : {}),
        ...(body.subjective !== undefined ? { subjective: body.subjective } : {}),
        ...(body.objective !== undefined ? { objective: body.objective } : {}),
        ...(body.assessment !== undefined ? { assessment: body.assessment } : {}),
        ...(body.plan !== undefined ? { plan: body.plan } : {}),
        ...(body.cie10Codes ? { cie10Codes: body.cie10Codes } : {}),
      },
      include: { professional: { select: { id: true, name: true } } },
    });
    const pat = await prisma.patient.findUnique({ where: { id: cur.patientId } });
    await audit(req, "Editó evolución", "historia", pat ? `${pat.firstName} ${pat.lastName}` : "");
    res.json(r);
  } catch (e) {
    next(e);
  }
});

router.delete("/:id/evolucion/:rid", requireModule("historia", "write"), async (req, res, next) => {
  try {
    const cur = await prisma.clinicalRecord.findUnique({ where: { id: req.params.rid } });
    if (!cur || cur.patientId !== req.params.id || cur.type !== "evolucion") throw notFound("Evolución no encontrada");
    await prisma.clinicalRecord.delete({ where: { id: cur.id } });
    const pat = await prisma.patient.findUnique({ where: { id: cur.patientId } });
    await audit(req, "Eliminó evolución", "historia", pat ? `${pat.firstName} ${pat.lastName}` : "");
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

// ----- Recetas -----
router.get("/:id/recetas", async (req, res, next) => {
  try {
    const list = await prisma.clinicalRecord.findMany({
      where: { patientId: req.params.id, type: "receta" },
      include: { professional: { select: { id: true, name: true } } },
      orderBy: { date: "desc" },
    });
    res.json(list);
  } catch (e) {
    next(e);
  }
});

const rxItemSchema = z.object({
  ingredients: z.array(z.object({ name: z.string().min(1), concentration: z.string().default("") })).min(1),
  vehicle: z.string().default(""),
  quantity: z.string().default(""),
  instructions: z.string().min(1),
});
const newRecetaSchema = z.object({
  professionalId: z.string().uuid(),
  templateId: z.string().optional(),
  items: z.array(rxItemSchema).min(1),
});
router.post("/:id/recetas", requireModule("historia", "write"), async (req, res, next) => {
  try {
    const pat = await prisma.patient.findUnique({ where: { id: req.params.id } });
    if (!pat) throw notFound("Paciente no encontrado");
    const body = newRecetaSchema.parse(req.body);
    const r = await prisma.clinicalRecord.create({
      data: {
        patientId: pat.id,
        professionalId: body.professionalId,
        type: "receta",
        date: new Date(),
        prescription: { templateId: body.templateId, items: body.items } as Prisma.InputJsonValue,
      },
      include: { professional: { select: { id: true, name: true } } },
    });
    await audit(req, "Emitió receta", "historia", `${pat.firstName} ${pat.lastName}`);
    res.status(201).json(r);
  } catch (e) {
    next(e);
  }
});

const updRecetaSchema = z.object({
  professionalId: z.string().uuid().optional(),
  items: z.array(rxItemSchema).min(1).optional(),
});
router.patch("/:id/recetas/:rid", requireModule("historia", "write"), async (req, res, next) => {
  try {
    const cur = await prisma.clinicalRecord.findUnique({ where: { id: req.params.rid } });
    if (!cur || cur.patientId !== req.params.id || cur.type !== "receta") throw notFound("Receta no encontrada");
    const body = updRecetaSchema.parse(req.body);
    const prev = (cur.prescription as { templateId?: string; items: unknown[] } | null) ?? { items: [] };
    const r = await prisma.clinicalRecord.update({
      where: { id: cur.id },
      data: {
        ...(body.professionalId ? { professionalId: body.professionalId } : {}),
        ...(body.items ? { prescription: { templateId: prev.templateId, items: body.items } as Prisma.InputJsonValue } : {}),
      },
      include: { professional: { select: { id: true, name: true } } },
    });
    const pat = await prisma.patient.findUnique({ where: { id: cur.patientId } });
    await audit(req, "Editó receta", "historia", pat ? `${pat.firstName} ${pat.lastName}` : "");
    res.json(r);
  } catch (e) {
    next(e);
  }
});

router.delete("/:id/recetas/:rid", requireModule("historia", "write"), async (req, res, next) => {
  try {
    const cur = await prisma.clinicalRecord.findUnique({ where: { id: req.params.rid } });
    if (!cur || cur.patientId !== req.params.id || cur.type !== "receta") throw notFound("Receta no encontrada");
    await prisma.clinicalRecord.delete({ where: { id: cur.id } });
    const pat = await prisma.patient.findUnique({ where: { id: cur.patientId } });
    await audit(req, "Eliminó receta", "historia", pat ? `${pat.firstName} ${pat.lastName}` : "");
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

// ----- Consents -----
router.get("/:id/consents", async (req, res, next) => {
  try {
    const where: Prisma.ConsentWhereInput = { patientId: req.params.id };
    if (req.query.signed === "1") where.status = "firmado";
    const list = await prisma.consent.findMany({
      where,
      include: { template: true },
    });
    res.json(list);
  } catch (e) {
    next(e);
  }
});

const newConsentSchema = z.object({ templateId: z.string().uuid() });
router.post("/:id/consents", requireModule("consentimientos", "write"), async (req, res, next) => {
  try {
    const pat = await prisma.patient.findUnique({ where: { id: req.params.id } });
    if (!pat) throw notFound("Paciente no encontrado");
    const body = newConsentSchema.parse(req.body);
    const tpl = await prisma.consentTemplate.findFirst({
      where: { id: body.templateId, clinicId: req.user!.clinicId },
    });
    if (!tpl) throw badRequest("Plantilla de consentimiento inválida");
    const c = await prisma.consent.create({
      data: { patientId: pat.id, templateId: tpl.id, status: "pendiente" },
      include: { template: true },
    });
    await audit(req, "Generó consentimiento", "consentimiento", `${tpl.title} · ${pat.firstName} ${pat.lastName}`);
    res.status(201).json(c);
  } catch (e) {
    next(e);
  }
});

// ----- Procedures -----
router.get("/:id/procedures", async (req, res, next) => {
  try {
    const list = await prisma.procedure.findMany({
      where: { patientId: req.params.id },
      include: { service: { select: { name: true } }, professional: { select: { name: true } } },
      orderBy: { date: "desc" },
    });
    res.json(list);
  } catch (e) {
    next(e);
  }
});

const newProcedureSchema = z.object({
  serviceId: z.string().uuid(),
  professionalId: z.string().uuid(),
  consentId: z.string().uuid(),
  productUsed: z.string().optional(),
  units: z.number().int().positive().optional(),
  lotNumber: z.string().optional(),
  expiry: z.string().optional(), // YYYY-MM-DD
  injectionAreas: z.array(z.string()).default([]),
  notes: z.string().optional(),
});
router.post("/:id/procedures", requireModule("procedimientos", "write"), async (req, res, next) => {
  try {
    const pat = await prisma.patient.findUnique({ where: { id: req.params.id } });
    if (!pat) throw notFound("Paciente no encontrado");
    const body = newProcedureSchema.parse(req.body);
    const consent = await prisma.consent.findUnique({ where: { id: body.consentId } });
    if (!consent || consent.patientId !== pat.id) throw badRequest("Consentimiento no pertenece al paciente");
    if (consent.status !== "firmado") throw conflict("El consentimiento no está firmado");
    const pr = await prisma.procedure.create({
      data: {
        patientId: pat.id,
        serviceId: body.serviceId,
        professionalId: body.professionalId,
        date: new Date(),
        productUsed: body.productUsed ?? null,
        units: body.units ?? null,
        lotNumber: body.lotNumber ?? null,
        expiry: body.expiry ? new Date(body.expiry) : null,
        injectionAreas: body.injectionAreas,
        consentId: consent.id,
        notes: body.notes ?? null,
      },
      include: { service: { select: { name: true } }, professional: { select: { name: true } } },
    });
    await audit(req, "Registró procedimiento", "historia", `${pr.service?.name ?? ""} · ${pat.firstName} ${pat.lastName}`);
    res.status(201).json(pr);
  } catch (e) {
    next(e);
  }
});

// ----- Package balances (venta) -----
router.get("/:id/balances", async (req, res, next) => {
  try {
    const list = await prisma.packageBalance.findMany({
      where: { patientId: req.params.id },
      include: { package: true, payments: { select: { amount: true } } },
      orderBy: { soldAt: "desc" },
    });
    res.json(list);
  } catch (e) {
    next(e);
  }
});

const sellPackageSchema = z.object({
  packageId: z.string().uuid(),
  sellerProfessionalId: z.string().uuid().nullish(),
  initialPayment: z.number().nonnegative().optional(),
  method: z.string().optional(),
  note: z.string().optional(),
});
router.post("/:id/balances", requireModule("paquetes", "write"), async (req, res, next) => {
  try {
    const pat = await prisma.patient.findUnique({ where: { id: req.params.id } });
    if (!pat) throw notFound("Paciente no encontrado");
    const body = sellPackageSchema.parse(req.body);
    const pk = await prisma.package.findFirst({
      where: { id: body.packageId, clinicId: req.user!.clinicId },
    });
    if (!pk || !pk.active) throw badRequest("Paquete no disponible");

    const soldAt = new Date();
    const vencimiento = new Date(Date.now() + (pk.validityDays || 365) * 864e5);
    const bal = await prisma.packageBalance.create({
      data: {
        clinicId: req.user!.clinicId,
        patientId: pat.id,
        packageId: pk.id,
        soldAt,
        sellerProfessionalId: body.sellerProfessionalId ?? null,
        sessionsTotal: pk.sessions,
        sessionsUsed: 0,
        price: pk.price,
        vencimiento,
        status: "activo",
      },
      include: { package: true, payments: { select: { amount: true } } },
    });
    if (body.initialPayment && body.initialPayment > 0) {
      await prisma.packagePayment.create({
        data: {
          balanceId: bal.id,
          amount: body.initialPayment,
          method: body.method ?? "efectivo",
          note: body.note ?? "Abono inicial",
        },
      });
    }
    await audit(req, "Vendió paquete", "paquetes", `${pk.name} · ${pat.firstName} ${pat.lastName}`);
    const fresh = await prisma.packageBalance.findUnique({
      where: { id: bal.id },
      include: { package: true, payments: { select: { amount: true } } },
    });
    res.status(201).json(fresh);
  } catch (e) {
    next(e);
  }
});

// ----- Invoices -----
router.get("/:id/invoices", async (req, res, next) => {
  try {
    const list = await prisma.invoice.findMany({
      where: { patientId: req.params.id, clinicId: req.user!.clinicId },
      orderBy: { date: "desc" },
    });
    res.json(list);
  } catch (e) {
    next(e);
  }
});

const invoiceLineSchema = z.object({
  serviceId: z.string().uuid(),
  description: z.string().min(1),
  quantity: z.number().int().positive(),
  unitPrice: z.number().nonnegative(),
  vatRate: z.number().int(),
});
const newInvoiceSchema = z.object({
  customerName: z.string().optional(),
  lines: z.array(invoiceLineSchema).min(1),
});
router.post("/:id/invoices", requireModule("facturacion", "write"), async (req, res, next) => {
  try {
    const pat = await prisma.patient.findUnique({ where: { id: req.params.id } });
    if (!pat) throw notFound("Paciente no encontrado");
    const body = newInvoiceSchema.parse(req.body);

    const t = calcInvoiceTotals(body.lines);
    const last = await prisma.invoice.findFirst({
      where: { clinicId: req.user!.clinicId },
      orderBy: { number: "desc" },
      select: { number: true },
    });
    const { seq, number } = nextInvoiceNumber(last?.number ?? null);
    const date = new Date();
    const accessKey = sriAccessKey(date, seq, EMISOR_RUC);
    const inv = await prisma.invoice.create({
      data: {
        clinicId: req.user!.clinicId,
        number,
        patientId: pat.id,
        customerName: body.customerName ?? `${pat.firstName} ${pat.lastName}`,
        date,
        lines: body.lines as unknown as Prisma.InputJsonValue,
        subtotal0: t.subtotal0,
        subtotal15: t.subtotal15,
        vatAmount: t.vatAmount,
        total: t.total,
        accessKey,
        status: "generada",
      },
    });
    await audit(req, "Emitió factura electrónica", "facturacion", `Factura ${inv.number}`);
    res.status(201).json(inv);
  } catch (e) {
    next(e);
  }
});

// ----- Photos -----
router.get("/:id/photos", async (req, res, next) => {
  try {
    const list = await prisma.photo.findMany({
      where: { patientId: req.params.id },
      orderBy: { takenAt: "asc" },
    });
    res.json(list);
  } catch (e) {
    next(e);
  }
});

function serializePatient(p: Awaited<ReturnType<typeof prisma.patient.findUnique>>) {
  if (!p) return null;
  return {
    id: p.id,
    first_name: p.firstName,
    last_name: p.lastName,
    id_type: p.idType,
    id_number: p.idNumber,
    birth_date: p.birthDate.toISOString().slice(0, 10),
    sex: p.sex,
    email: p.email,
    phone: p.phone,
    city: p.city,
    next_appointment: p.nextAppointment?.toISOString() ?? null,
    background: p.background,
    created_at: p.createdAt.toISOString(),
  };
}

export default router;
