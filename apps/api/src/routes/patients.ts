import { Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../db.js";
import { env } from "../env.js";
import { requireAuth, requireModule, requireRole } from "../middleware/auth.js";
import { audit } from "../lib/audit.js";
import { badRequest, conflict, forbidden, notFound } from "../lib/errors.js";
import { calcInvoiceTotals, invoiceNumber, sriAccessKey } from "../lib/sri.js";

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

async function ensureProfessionalForClinic(professionalId: string, clinicId: string) {
  const professional = await prisma.professional.findFirst({
    where: { id: professionalId, clinicId },
    select: { id: true },
  });
  if (!professional) throw badRequest("Profesional no valido para esta clinica");
  return professional;
}

function assertProfessionalAuthorship(req: Express.Request, professionalId: string) {
  if (req.user!.role !== "profesional" && req.user!.role !== "esteticista") return;
  if (!req.user!.professionalId) throw forbidden("El usuario no tiene un profesional asociado");
  if (req.user!.professionalId !== professionalId) {
    throw forbidden("Solo puedes registrar o modificar actividad clínica con tu profesional asociado");
  }
}

async function ensureServiceForClinic(serviceId: string, clinicId: string) {
  const service = await prisma.service.findFirst({
    where: { id: serviceId, clinicId },
    select: { id: true },
  });
  if (!service) throw badRequest("Servicio no valido para esta clinica");
  return service;
}

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
router.get("/:id/evolucion", requireModule("historia"), async (req, res, next) => {
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
  clinicalMetrics: z.object({
    severity: z.number().min(0).max(10),
    pain: z.number().min(0).max(10),
    pruritus: z.number().min(0).max(10),
    inflammation: z.number().min(0).max(10),
    satisfaction: z.number().min(0).max(10),
  }).optional(),
});
router.post("/:id/evolucion", requireModule("historia", "write"), async (req, res, next) => {
  try {
    const pat = await prisma.patient.findUnique({ where: { id: req.params.id } });
    if (!pat) throw notFound("Paciente no encontrado");
    const body = newEvolucionSchema.parse(req.body);
    await ensureProfessionalForClinic(body.professionalId, req.user!.clinicId);
    assertProfessionalAuthorship(req, body.professionalId);
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
        prescription: body.clinicalMetrics ? { clinicalMetrics: body.clinicalMetrics } as Prisma.InputJsonValue : undefined,
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
    assertProfessionalAuthorship(req, cur.professionalId);
    const body = updEvolucionSchema.parse(req.body);
    if (body.professionalId) {
      await ensureProfessionalForClinic(body.professionalId, req.user!.clinicId);
      assertProfessionalAuthorship(req, body.professionalId);
    }
    const r = await prisma.clinicalRecord.update({
      where: { id: cur.id },
      data: {
        ...(body.professionalId ? { professionalId: body.professionalId } : {}),
        ...(body.subjective !== undefined ? { subjective: body.subjective } : {}),
        ...(body.objective !== undefined ? { objective: body.objective } : {}),
        ...(body.assessment !== undefined ? { assessment: body.assessment } : {}),
        ...(body.plan !== undefined ? { plan: body.plan } : {}),
        ...(body.cie10Codes ? { cie10Codes: body.cie10Codes } : {}),
        ...(body.clinicalMetrics ? { prescription: { clinicalMetrics: body.clinicalMetrics } as Prisma.InputJsonValue } : {}),
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
    assertProfessionalAuthorship(req, cur.professionalId);
    await prisma.clinicalRecord.delete({ where: { id: cur.id } });
    const pat = await prisma.patient.findUnique({ where: { id: cur.patientId } });
    await audit(req, "Eliminó evolución", "historia", pat ? `${pat.firstName} ${pat.lastName}` : "");
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

// ----- Recetas -----
router.get("/:id/recetas", requireModule("historia"), async (req, res, next) => {
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
    await ensureProfessionalForClinic(body.professionalId, req.user!.clinicId);
    assertProfessionalAuthorship(req, body.professionalId);
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
    assertProfessionalAuthorship(req, cur.professionalId);
    const body = updRecetaSchema.parse(req.body);
    if (body.professionalId) {
      await ensureProfessionalForClinic(body.professionalId, req.user!.clinicId);
      assertProfessionalAuthorship(req, body.professionalId);
    }
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
    assertProfessionalAuthorship(req, cur.professionalId);
    await prisma.clinicalRecord.delete({ where: { id: cur.id } });
    const pat = await prisma.patient.findUnique({ where: { id: cur.patientId } });
    await audit(req, "Eliminó receta", "historia", pat ? `${pat.firstName} ${pat.lastName}` : "");
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

// ----- Consents -----
const publicConsentTemplateSelect = {
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
} as const;

const publicConsentSelect = {
  id: true,
  patientId: true,
  templateId: true,
  status: true,
  signedAt: true,
  procedureId: true,
  templateTitle: true,
  templateBody: true,
  templateKind: true,
  templateVersion: true,
  signedIp: true,
  signedUserAgent: true,
  signedByUserId: true,
  signedByUserName: true,
  patientName: true,
  patientIdType: true,
  patientIdNumber: true,
  patientBirthDate: true,
  clinicName: true,
  clinicRuc: true,
  contentHash: true,
  signatureHash: true,
  pdfHash: true,
  revokedAt: true,
  revocationReason: true,
  revokedByUserId: true,
  template: { select: publicConsentTemplateSelect },
  events: {
    select: { id: true, kind: true, body: true, createdById: true, createdByName: true, at: true, ip: true, previousHash: true, chainSequence: true, hash: true },
    orderBy: { at: "asc" as const },
  },
} as const;

router.get("/:id/consents", requireModule("consentimientos"), async (req, res, next) => {
  try {
    const patient = await prisma.patient.findFirst({ where: { id: req.params.id, clinicId: req.user!.clinicId } });
    if (!patient) throw notFound("Paciente no encontrado");
    const where: Prisma.ConsentWhereInput = { patientId: req.params.id };
    if (req.query.signed === "1") where.status = "firmado";
    const list = await prisma.consent.findMany({
      where,
      select: publicConsentSelect,
      orderBy: { signedAt: "desc" },
    });
    res.json(list);
  } catch (e) {
    next(e);
  }
});

const newConsentSchema = z.object({ templateId: z.string().uuid() });
router.post(
  "/:id/consents",
  requireModule("consentimientos", "write"),
  requireRole("admin", "profesional", "esteticista"),
  async (req, res, next) => {
  try {
    const pat = await prisma.patient.findFirst({
      where: { id: req.params.id, clinicId: req.user!.clinicId },
      include: { clinic: { select: { name: true, ruc: true } } },
    });
    if (!pat) throw notFound("Paciente no encontrado");
    const body = newConsentSchema.parse(req.body);
    const tpl = await prisma.consentTemplate.findFirst({
      where: { id: body.templateId, clinicId: req.user!.clinicId },
    });
    if (!tpl || tpl.status !== "aprobada") throw badRequest("La plantilla no existe o todavía no está aprobada");
    if (!tpl.allowedRoles.includes(req.user!.role)) throw badRequest("Su rol no está autorizado para generar esta plantilla");
    const c = await prisma.consent.create({
      data: {
        patientId: pat.id,
        templateId: tpl.id,
        status: "pendiente",
        templateTitle: tpl.title,
        templateBody: tpl.body,
        templateKind: tpl.kind,
        templateVersion: tpl.version,
        patientName: `${pat.firstName} ${pat.lastName}`,
        patientIdType: pat.idType,
        patientIdNumber: pat.idNumber,
        patientBirthDate: pat.birthDate,
        clinicName: pat.clinic.name,
        clinicRuc: pat.clinic.ruc,
      },
      select: publicConsentSelect,
    });
    await audit(req, "Generó consentimiento", "consentimiento", `${tpl.title} · ${pat.firstName} ${pat.lastName}`);
    res.status(201).json(c);
  } catch (e) {
    next(e);
  }
  },
);

// ----- Procedures -----
router.get("/:id/procedures", requireModule("procedimientos"), async (req, res, next) => {
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
    await ensureServiceForClinic(body.serviceId, req.user!.clinicId);
    await ensureProfessionalForClinic(body.professionalId, req.user!.clinicId);
    assertProfessionalAuthorship(req, body.professionalId);
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
router.get("/:id/balances", requireModule("paquetes"), async (req, res, next) => {
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
    if (body.sellerProfessionalId) {
      await ensureProfessionalForClinic(body.sellerProfessionalId, req.user!.clinicId);
    }

    const soldAt = new Date();
    if (body.initialPayment && body.initialPayment > Number(pk.price)) {
      throw badRequest("El abono inicial no puede superar el precio del paquete");
    }
    const bal = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw(
        Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${`package:${pk.id}`}))`,
      );
      const currentPackage = await tx.package.findFirst({
        where: { id: pk.id, clinicId: req.user!.clinicId, active: true },
      });
      if (!currentPackage) throw badRequest("Paquete no disponible");
      if (body.initialPayment && body.initialPayment > Number(currentPackage.price)) {
        throw badRequest("El abono inicial no puede superar el precio del paquete");
      }
      const vencimiento = new Date(soldAt.getTime() + (currentPackage.validityDays || 365) * 864e5);
      const created = await tx.packageBalance.create({
        data: {
          clinicId: req.user!.clinicId,
          patientId: pat.id,
          packageId: pk.id,
          soldAt,
          sellerProfessionalId: body.sellerProfessionalId ?? null,
          sessionsTotal: currentPackage.sessions,
          sessionsUsed: 0,
          price: currentPackage.price,
          vencimiento,
          status: "activo",
        },
      });
      if (body.initialPayment && body.initialPayment > 0) {
        await tx.packagePayment.create({
          data: {
            balanceId: created.id,
            amount: body.initialPayment,
            method: body.method ?? "efectivo",
            note: body.note ?? "Abono inicial",
          },
        });
      }
      return tx.packageBalance.findUniqueOrThrow({
        where: { id: created.id },
        include: { package: true, payments: { select: { amount: true } } },
      });
    });
    await audit(req, "Vendió paquete", "paquetes", `${pk.name} · ${pat.firstName} ${pat.lastName}`);
    res.status(201).json(bal);
  } catch (e) {
    next(e);
  }
});

// ----- Invoices -----
router.get("/:id/invoices", requireModule("facturacion"), async (req, res, next) => {
  try {
    if (!env.INVOICES_ENABLED) throw notFound("Facturacion no habilitada");
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
  vatRate: z.union([z.literal(0), z.literal(15)]),
});
const newInvoiceSchema = z.object({
  customerName: z.string().optional(),
  lines: z.array(invoiceLineSchema).min(1),
});
router.post("/:id/invoices", requireModule("facturacion", "write"), async (req, res, next) => {
  try {
    if (!env.INVOICES_ENABLED) throw notFound("Facturacion no habilitada");
    const pat = await prisma.patient.findUnique({ where: { id: req.params.id } });
    if (!pat) throw notFound("Paciente no encontrado");
    const body = newInvoiceSchema.parse(req.body);

    const serviceIds = [...new Set(body.lines.map((line) => line.serviceId))];
    const services = await prisma.service.findMany({
      where: { id: { in: serviceIds }, clinicId: req.user!.clinicId, active: true },
      select: { id: true, name: true, price: true, vatRate: true },
    });
    if (services.length !== serviceIds.length) throw badRequest("Uno o mas servicios no pertenecen a la clinica");
    const byId = new Map(services.map((service) => [service.id, service]));
    const lines = body.lines.map((line) => {
      const service = byId.get(line.serviceId)!;
      return {
        serviceId: service.id,
        description: service.name,
        quantity: line.quantity,
        unitPrice: Number(service.price),
        vatRate: service.vatRate,
      };
    });
    const t = calcInvoiceTotals(lines);
    const inv = await prisma.$transaction(async (tx) => {
      const clinic = await tx.clinic.findUnique({
        where: { id: req.user!.clinicId },
        select: { ruc: true },
      });
      if (!clinic?.ruc || !/^\d{13}$/.test(clinic.ruc)) throw badRequest("Configura un RUC valido para facturar");
      const sequence = await tx.clinic.update({
        where: { id: req.user!.clinicId },
        data: { invoiceSequence: { increment: 1 } },
        select: { invoiceSequence: true },
      });
      const date = new Date();
      return tx.invoice.create({
        data: {
          clinicId: req.user!.clinicId,
          number: invoiceNumber(sequence.invoiceSequence),
          patientId: pat.id,
          customerName: body.customerName ?? `${pat.firstName} ${pat.lastName}`,
          date,
          lines: lines as unknown as Prisma.InputJsonValue,
          subtotal0: t.subtotal0,
          subtotal15: t.subtotal15,
          vatAmount: t.vatAmount,
          total: t.total,
          accessKey: sriAccessKey(date, sequence.invoiceSequence, clinic.ruc),
          status: "generada",
        },
      });
    });
    await audit(req, "Emitió factura electrónica", "facturacion", `Factura ${inv.number}`);
    res.status(201).json(inv);
  } catch (e) {
    next(e);
  }
});

// ----- Photos -----
router.get("/:id/photos", requireModule("fotos"), async (req, res, next) => {
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
