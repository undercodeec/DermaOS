import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth, requireModule, requireRole } from "../middleware/auth.js";
import { audit } from "../lib/audit.js";
import { badRequest, conflict, notFound } from "../lib/errors.js";
import { encryptSecret } from "../lib/secret-box.js";
import { extractConsentText } from "../lib/consent-documents.js";

const router = Router();
router.use(requireAuth, requireRole("admin"));
router.use(requireModule("sistema"));

const documentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
});

const logoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 1024 * 1024 },
});

function serializeConsentTemplate(t: {
  id: string;
  kind: "clinico" | "imagen";
  title: string;
  procedureType: string;
  body: string;
  status: "borrador" | "aprobada" | "archivada";
  seriesId: string;
  version: number;
  sourceName: string | null;
  sourceMime: string | null;
  sourceSha256: string | null;
  createdAt: Date;
  updatedAt: Date;
  approvedAt: Date | null;
  sourceFile?: Buffer | Uint8Array | null;
}) {
  const { sourceFile: _sourceFile, ...safe } = t;
  return { ...safe, hasSource: !!t.sourceName };
}

const consentTemplateSchema = z.object({
  kind: z.enum(["clinico", "imagen"]),
  title: z.string().trim().min(3).max(180),
  procedureType: z.string().trim().min(2).max(120),
  body: z.string().trim().min(20).max(100_000),
});

router.get("/clinic-branding", async (req, res, next) => {
  try {
    const clinic = await prisma.clinic.findUnique({
      where: { id: req.user!.clinicId },
      select: { name: true, ruc: true, logoData: true },
    });
    if (!clinic) throw notFound("Clínica no encontrada");
    res.json(clinic);
  } catch (e) {
    next(e);
  }
});

router.post("/clinic-branding/logo", logoUpload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) throw badRequest("Seleccione una imagen");
    const mime = detectLogoMime(req.file.buffer);
    if (!mime) throw badRequest("El logo debe ser PNG o JPEG");
    const logoData = `data:${mime};base64,${req.file.buffer.toString("base64")}`;
    await prisma.clinic.update({ where: { id: req.user!.clinicId }, data: { logoData } });
    await audit(req, "Actualizó logo de la clínica", "sistema", "Identidad de documentos");
    res.json({ logoData });
  } catch (e) {
    next(e);
  }
});

router.delete("/clinic-branding/logo", async (req, res, next) => {
  try {
    await prisma.clinic.update({ where: { id: req.user!.clinicId }, data: { logoData: null } });
    await audit(req, "Eliminó logo de la clínica", "sistema", "Identidad de documentos");
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

router.get("/consent-templates", async (req, res, next) => {
  try {
    const list = await prisma.consentTemplate.findMany({
      where: { clinicId: req.user!.clinicId },
      select: {
        id: true, kind: true, title: true, procedureType: true, body: true, status: true,
        seriesId: true, version: true, sourceName: true, sourceMime: true, sourceSha256: true,
        createdAt: true, updatedAt: true, approvedAt: true,
      },
      orderBy: [{ updatedAt: "desc" }],
    });
    res.json(list.map(serializeConsentTemplate));
  } catch (e) {
    next(e);
  }
});

router.post("/consent-templates", async (req, res, next) => {
  try {
    const body = consentTemplateSchema.parse(req.body);
    const created = await prisma.consentTemplate.create({ data: { ...body, clinicId: req.user!.clinicId } });
    await audit(req, "Creó plantilla de consentimiento", "consentimiento", created.title);
    res.status(201).json(serializeConsentTemplate(created));
  } catch (e) {
    next(e);
  }
});

router.post("/consent-templates/import", documentUpload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) throw badRequest("Seleccione un documento PDF o DOCX");
    const kind = z.enum(["clinico", "imagen"]).parse(req.body.kind ?? "clinico");
    const extracted = await extractConsentText(req.file.buffer, req.file.mimetype, req.file.originalname);
    const title = String(req.body.title || req.file.originalname.replace(/\.(pdf|docx)$/i, "")).trim();
    const procedureType = String(req.body.procedureType || "General").trim();
    const input = consentTemplateSchema.parse({ kind, title, procedureType, body: extracted });
    const created = await prisma.consentTemplate.create({
      data: {
        ...input,
        clinicId: req.user!.clinicId,
        sourceName: req.file.originalname,
        sourceMime: req.file.mimetype,
        sourceSha256: crypto.createHash("sha256").update(req.file.buffer).digest("hex"),
        sourceFile: req.file.buffer,
      },
    });
    await audit(req, "Importó documento a plantilla", "consentimiento", `${created.title} · ${req.file.originalname}`);
    res.status(201).json(serializeConsentTemplate(created));
  } catch (e) {
    next(e);
  }
});

router.patch("/consent-templates/:id", async (req, res, next) => {
  try {
    const current = await prisma.consentTemplate.findFirst({ where: { id: req.params.id, clinicId: req.user!.clinicId } });
    if (!current) throw notFound("Plantilla no encontrada");
    if (current.status !== "borrador") throw conflict("Una plantilla aprobada no se modifica; cree una nueva versión");
    const body = consentTemplateSchema.parse(req.body);
    const updated = await prisma.consentTemplate.update({ where: { id: current.id }, data: body });
    await audit(req, "Editó borrador de consentimiento", "consentimiento", updated.title);
    res.json(serializeConsentTemplate(updated));
  } catch (e) {
    next(e);
  }
});

router.post("/consent-templates/:id/approve", async (req, res, next) => {
  try {
    const current = await prisma.consentTemplate.findFirst({ where: { id: req.params.id, clinicId: req.user!.clinicId } });
    if (!current) throw notFound("Plantilla no encontrada");
    if (current.status !== "borrador") throw conflict("Solo se pueden aprobar borradores");
    const updated = await prisma.consentTemplate.update({
      where: { id: current.id },
      data: { status: "aprobada", approvedAt: new Date() },
    });
    await audit(req, "Aprobó plantilla de consentimiento", "consentimiento", `${updated.title} v${updated.version}`);
    res.json(serializeConsentTemplate(updated));
  } catch (e) {
    next(e);
  }
});

router.post("/consent-templates/:id/new-version", async (req, res, next) => {
  try {
    const current = await prisma.consentTemplate.findFirst({ where: { id: req.params.id, clinicId: req.user!.clinicId } });
    if (!current) throw notFound("Plantilla no encontrada");
    if (current.status === "borrador") throw conflict("Edite el borrador existente antes de crear otra versión");
    const latest = await prisma.consentTemplate.aggregate({
      where: { clinicId: req.user!.clinicId, seriesId: current.seriesId },
      _max: { version: true },
    });
    const created = await prisma.consentTemplate.create({
      data: {
        clinicId: current.clinicId,
        kind: current.kind,
        title: current.title,
        procedureType: current.procedureType,
        body: current.body,
        seriesId: current.seriesId,
        version: (latest._max.version ?? current.version) + 1,
        sourceName: current.sourceName,
        sourceMime: current.sourceMime,
        sourceSha256: current.sourceSha256,
        sourceFile: current.sourceFile,
      },
    });
    await audit(req, "Creó nueva versión de consentimiento", "consentimiento", `${created.title} v${created.version}`);
    res.status(201).json(serializeConsentTemplate(created));
  } catch (e) {
    next(e);
  }
});

router.post("/consent-templates/:id/archive", async (req, res, next) => {
  try {
    const current = await prisma.consentTemplate.findFirst({ where: { id: req.params.id, clinicId: req.user!.clinicId } });
    if (!current) throw notFound("Plantilla no encontrada");
    const updated = await prisma.consentTemplate.update({ where: { id: current.id }, data: { status: "archivada" } });
    await audit(req, "Archivó plantilla de consentimiento", "consentimiento", updated.title);
    res.json(serializeConsentTemplate(updated));
  } catch (e) {
    next(e);
  }
});

router.get("/consent-templates/:id/source", async (req, res, next) => {
  try {
    const current = await prisma.consentTemplate.findFirst({ where: { id: req.params.id, clinicId: req.user!.clinicId } });
    if (!current?.sourceFile || !current.sourceName) throw notFound("Documento original no encontrado");
    res.setHeader("Content-Type", current.sourceMime || "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(current.sourceName)}`);
    res.send(current.sourceFile);
  } catch (e) {
    next(e);
  }
});

router.delete("/consent-templates/:id", async (req, res, next) => {
  try {
    const current = await prisma.consentTemplate.findFirst({ where: { id: req.params.id, clinicId: req.user!.clinicId } });
    if (!current) throw notFound("Plantilla no encontrada");
    if (current.status !== "borrador") throw conflict("Solo se pueden eliminar borradores; archive las plantillas aprobadas");
    await prisma.consentTemplate.delete({ where: { id: current.id } });
    await audit(req, "Eliminó borrador de consentimiento", "consentimiento", current.title);
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

function detectLogoMime(buffer: Buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  return null;
}

function serializePayphoneProvider(p: Awaited<ReturnType<typeof prisma.clinicPaymentProvider.findFirst>>) {
  if (!p) {
    return {
      configured: false,
      provider: "payphone",
      mode: "manual",
      ruc: "",
      storeId: "",
      status: "missing",
      hasToken: false,
      lastVerifiedAt: null,
      updatedAt: null,
    };
  }
  return {
    configured: true,
    provider: p.provider,
    mode: p.mode,
    ruc: p.ruc ?? "",
    storeId: p.storeId,
    status: p.status,
    hasToken: true,
    lastVerifiedAt: p.lastVerifiedAt?.toISOString() ?? null,
    updatedAt: p.updatedAt.toISOString(),
  };
}

router.get("/payphone", async (req, res, next) => {
  try {
    const provider = await prisma.clinicPaymentProvider.findFirst({
      where: { clinicId: req.user!.clinicId, provider: "payphone" },
    });
    res.json(serializePayphoneProvider(provider));
  } catch (e) {
    next(e);
  }
});

const payphoneSchema = z.object({
  ruc: z.string().trim().optional().nullable(),
  storeId: z.string().trim().min(1),
  token: z.string().trim().min(1).optional(),
  status: z.enum(["active", "disabled"]).default("active"),
});

router.put("/payphone", async (req, res, next) => {
  try {
    const b = payphoneSchema.parse(req.body);
    const cur = await prisma.clinicPaymentProvider.findFirst({
      where: { clinicId: req.user!.clinicId, provider: "payphone" },
    });
    if (!cur && !b.token) {
      throw badRequest("Token Payphone requerido para la primera configuracion");
    }
    const data = {
      ruc: b.ruc || null,
      storeId: b.storeId,
      status: b.status,
      mode: "manual",
    };
    const provider = cur
      ? await prisma.clinicPaymentProvider.update({
          where: { id: cur.id },
          data: {
            ...data,
            ...(b.token ? { tokenEncrypted: encryptSecret(b.token) } : {}),
          },
        })
      : await prisma.clinicPaymentProvider.create({
          data: {
            clinicId: req.user!.clinicId,
            provider: "payphone",
            tokenEncrypted: encryptSecret(b.token!),
            ...data,
          },
        });
    await audit(req, "Actualizo credenciales Payphone", "sistema", `storeId ${provider.storeId}`);
    res.json(serializePayphoneProvider(provider));
  } catch (e) {
    next(e);
  }
});

router.get("/users", async (req, res, next) => {
  try {
    const list = await prisma.user.findMany({
      where: { clinicId: req.user!.clinicId },
      orderBy: [{ active: "desc" }, { fullName: "asc" }],
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        active: true,
        mfaEnabled: true,
        professionalId: true,
        lastAccess: true,
        createdAt: true,
      },
    });
    res.json(
      list.map((u) => ({
        ...u,
        lastAccess: u.lastAccess?.toISOString() ?? null,
        createdAt: u.createdAt.toISOString(),
      })),
    );
  } catch (e) {
    next(e);
  }
});

const createUserSchema = z.object({
  fullName: z.string().trim().min(2),
  email: z.string().trim().email(),
  password: z.string().min(8),
  role: z.enum(["admin", "recepcion", "profesional", "esteticista", "contador"]),
  active: z.boolean().default(true),
  mfaEnabled: z.boolean().default(false),
  professionalId: z.string().uuid().optional().nullable(),
});

router.post("/users", async (req, res, next) => {
  try {
    const b = createUserSchema.parse(req.body);
    const email = b.email.toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw conflict("El correo ya esta registrado");

    if (b.professionalId) {
      const professional = await prisma.professional.findFirst({
        where: { id: b.professionalId, clinicId: req.user!.clinicId },
        select: { id: true },
      });
      if (!professional) throw badRequest("Profesional no valido para esta clinica");
    }

    const passwordHash = await bcrypt.hash(b.password, 12);
    const user = await prisma.user.create({
      data: {
        clinicId: req.user!.clinicId,
        fullName: b.fullName,
        email,
        passwordHash,
        role: b.role,
        active: b.active,
        mfaEnabled: b.mfaEnabled,
        professionalId: b.professionalId || null,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        active: true,
        mfaEnabled: true,
        professionalId: true,
        lastAccess: true,
        createdAt: true,
      },
    });

    await audit(req, "Creo usuario", "sistema", `${user.fullName} · ${user.role}`);
    res.status(201).json({
      ...user,
      lastAccess: user.lastAccess?.toISOString() ?? null,
      createdAt: user.createdAt.toISOString(),
    });
  } catch (e) {
    next(e);
  }
});

const patchUserSchema = z.object({
  fullName: z.string().trim().min(2).optional(),
  email: z.string().trim().email().optional(),
  password: z.string().min(8).optional(),
  active: z.boolean().optional(),
  mfaEnabled: z.boolean().optional(),
  role: z.enum(["admin", "recepcion", "profesional", "esteticista", "contador"]).optional(),
  professionalId: z.string().uuid().optional().nullable(),
});

router.patch("/users/:id", async (req, res, next) => {
  try {
    const cur = await prisma.user.findFirst({
      where: { id: req.params.id, clinicId: req.user!.clinicId },
    });
    if (!cur) throw notFound("Usuario no encontrado");
    const b = patchUserSchema.parse(req.body);

    const removesActiveAdmin = cur.role === "admin"
      && cur.active
      && ((b.role !== undefined && b.role !== "admin") || b.active === false);
    if (removesActiveAdmin) {
      const activeAdmins = await prisma.user.count({
        where: { clinicId: req.user!.clinicId, role: "admin", active: true },
      });
      if (activeAdmins <= 1) throw conflict("La clinica debe conservar al menos un administrador activo");
    }

    const email = b.email?.toLowerCase();
    if (email && email !== cur.email) {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) throw conflict("El correo ya esta registrado");
    }

    if (b.professionalId) {
      const professional = await prisma.professional.findFirst({
        where: { id: b.professionalId, clinicId: req.user!.clinicId },
        select: { id: true },
      });
      if (!professional) throw badRequest("Profesional no valido para esta clinica");
    }

    const passwordHash = b.password ? await bcrypt.hash(b.password, 12) : undefined;
    const u = await prisma.user.update({
      where: { id: cur.id },
      data: {
        fullName: b.fullName ?? cur.fullName,
        email: email ?? cur.email,
        ...(passwordHash ? { passwordHash } : {}),
        active: b.active ?? cur.active,
        mfaEnabled: b.mfaEnabled ?? cur.mfaEnabled,
        role: b.role ?? cur.role,
        professionalId: b.professionalId !== undefined ? b.professionalId || null : cur.professionalId,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        active: true,
        mfaEnabled: true,
        professionalId: true,
        lastAccess: true,
        createdAt: true,
      },
    });

    const changes: string[] = [];
    if (b.fullName && b.fullName !== cur.fullName) changes.push("nombre actualizado");
    if (email && email !== cur.email) changes.push("email actualizado");
    if (passwordHash) changes.push("contrasena actualizada");
    if (b.active !== undefined && b.active !== cur.active) changes.push(b.active ? "activado" : "desactivado");
    if (b.mfaEnabled !== undefined && b.mfaEnabled !== cur.mfaEnabled) changes.push(`MFA ${b.mfaEnabled ? "activado" : "desactivado"}`);
    if (b.role && b.role !== cur.role) changes.push(`rol → ${b.role}`);
    if (b.professionalId !== undefined && b.professionalId !== cur.professionalId) changes.push("profesional actualizado");
    if (changes.length) {
      await audit(req, "Modificó permisos de usuario", "sistema", `${cur.fullName} · ${changes.join(", ")}`);
    }

    res.json({
      ...u,
      lastAccess: u.lastAccess?.toISOString() ?? null,
      createdAt: u.createdAt.toISOString(),
    });
  } catch (e) {
    next(e);
  }
});

router.post("/users/:id/mfa/reset", async (req, res, next) => {
  try {
    const cur = await prisma.user.findFirst({
      where: { id: req.params.id, clinicId: req.user!.clinicId },
    });
    if (!cur) throw notFound("Usuario no encontrado");
    await prisma.user.update({ where: { id: cur.id }, data: { mfaSecret: null } });
    await audit(req, "Reseteó MFA de usuario", "sistema", cur.fullName);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

router.get("/audit-logs", async (req, res, next) => {
  try {
    const { cat, from, to, take } = req.query as Record<string, string>;
    const where: Record<string, unknown> = { clinicId: req.user!.clinicId };
    if (cat) where.cat = cat;
    if (from || to) {
      const range: Record<string, Date> = {};
      if (from) range.gte = new Date(from);
      if (to) range.lte = new Date(to);
      where.at = range;
    }
    const list = await prisma.auditLog.findMany({
      where,
      include: { user: { select: { fullName: true, role: true } } },
      orderBy: { at: "desc" },
      take: Math.min(Number(take ?? 200), 500),
    });
    res.json(
      list.map((l) => ({
        id: l.id,
        userId: l.userId,
        action: l.action,
        cat: l.cat,
        label: l.label,
        at: l.at.toISOString(),
        ip: l.ip,
        user: l.user,
      })),
    );
  } catch (e) {
    next(e);
  }
});

export default router;
