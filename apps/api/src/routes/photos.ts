import { Router } from "express";
import multer from "multer";
import path from "node:path";
import crypto from "node:crypto";
import { z } from "zod";
import { prisma } from "../db.js";
import { env } from "../env.js";
import { requireAuth, requireModule } from "../middleware/auth.js";
import { rateLimit } from "../middleware/rateLimit.js";
import { audit } from "../lib/audit.js";
import { badRequest, notFound } from "../lib/errors.js";
import { readPhoto, removePhoto, storePhoto } from "../lib/photo-storage.js";

const router = Router();
router.use(requireAuth);
const photoUploadLimit = rateLimit({
  windowMs: 60_000,
  max: 20,
  key: (req) => `${req.user!.clinicId}:${req.user!.id}`,
  message: "Demasiadas fotos en poco tiempo",
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    cb(null, file.mimetype.startsWith("image/"));
  },
});

const metaSchema = z.object({
  patient_id: z.string().uuid(),
  body_area: z.string().min(1),
  lesion_tag: z.string().min(1),
  caption: z.string().min(1),
  kind: z.enum(["basal", "control"]).default("basal"),
});

const publicPhotoSelect = {
  id: true,
  patientId: true,
  takenAt: true,
  bodyArea: true,
  lesionTag: true,
  caption: true,
  kind: true,
  createdById: true,
} as const;

router.post(
  "/",
  requireModule("fotos", "write"),
  photoUploadLimit,
  upload.single("file"),
  async (req, res, next) => {
    let storagePath: string | null = null;
    let photoPersisted = false;
    try {
      if (!req.file) throw badRequest("Falta archivo");
      const meta = metaSchema.parse(req.body);

      // Verifica que el paciente pertenece a esta clínica
      const patient = await prisma.patient.findFirst({
        where: { id: meta.patient_id, clinicId: req.user!.clinicId },
      });
      if (!patient) throw badRequest("Paciente no encontrado");

      const imageType = detectImageType(req.file.buffer);
      if (!imageType) throw badRequest("El archivo no es una imagen JPEG, PNG o WebP valida");
      const filename = `${Date.now()}_${crypto.randomBytes(8).toString("hex")}.${imageType.ext}`;
      storagePath = await storePhoto({
        clinicId: req.user!.clinicId,
        patientId: patient.id,
        filename,
        buffer: req.file.buffer,
        contentType: imageType.mime,
      });

      const photo = await prisma.photo.create({
        data: {
          clinicId: req.user!.clinicId,
          patientId: meta.patient_id,
          bodyArea: meta.body_area,
          lesionTag: meta.lesion_tag,
          caption: meta.caption,
          kind: meta.kind,
          storagePath,
          createdById: req.user!.id,
        },
        select: publicPhotoSelect,
      });
      photoPersisted = true;
      await audit(req, "Subió fotografía clínica", "fotos", `${meta.lesion_tag}`);
      res.status(201).json(photo);
    } catch (e) {
      if (storagePath && !photoPersisted) await removePhoto(storagePath).catch(() => {});
      next(e);
    }
  },
);

// Sirve el binario protegido por JWT
router.get("/:id/file", requireModule("fotos"), async (req, res, next) => {
  try {
    const p = await prisma.photo.findFirst({
      where: { id: req.params.id, clinicId: req.user!.clinicId },
    });
    if (!p) throw notFound("Foto no existe");
    const image = await readPhoto(p.storagePath).catch(() => null);
    if (!image) throw notFound();
    await audit(req, "Visualizó fotografía clínica", "fotos", p.lesionTag);
    res.setHeader("Content-Type", guessMime(p.storagePath));
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("Content-Length", String(image.length));
    res.send(image);
  } catch (e) {
    next(e);
  }
});

router.put(
  "/:id/file",
  requireModule("fotos", "write"),
  photoUploadLimit,
  upload.single("file"),
  async (req, res, next) => {
    let replacementPath: string | null = null;
    let replacementPersisted = false;
    try {
      if (req.user!.role !== "admin") throw notFound();
      if (!req.file) throw badRequest("Falta archivo");
      const photo = await prisma.photo.findFirst({
        where: { id: req.params.id, clinicId: req.user!.clinicId },
      });
      if (!photo) throw notFound("Foto no existe");
      const imageType = detectImageType(req.file.buffer);
      if (!imageType) throw badRequest("El archivo no es una imagen JPEG, PNG o WebP valida");

      const filename = `${Date.now()}_${crypto.randomBytes(8).toString("hex")}.${imageType.ext}`;
      replacementPath = await storePhoto({
        clinicId: req.user!.clinicId,
        patientId: photo.patientId,
        filename,
        buffer: req.file.buffer,
        contentType: imageType.mime,
      });
      const updated = await prisma.photo.update({
        where: { id: photo.id },
        data: { storagePath: replacementPath },
        select: publicPhotoSelect,
      });
      replacementPersisted = true;
      await removePhoto(photo.storagePath).catch(() => {});
      await audit(req, "Reemplazo fotografia clinica", "fotos", photo.lesionTag);
      res.json(updated);
    } catch (e) {
      if (replacementPath && !replacementPersisted) await removePhoto(replacementPath).catch(() => {});
      next(e);
    }
  },
);

router.delete("/:id", requireModule("fotos", "write"), async (req, res, next) => {
  try {
    const p = await prisma.photo.findFirst({
      where: { id: req.params.id, clinicId: req.user!.clinicId },
    });
    if (!p) throw notFound();
    if (req.user!.role !== "admin") return next(notFound());
    await prisma.photo.delete({ where: { id: p.id } });
    await removePhoto(p.storagePath).catch(() => {});
    await audit(req, "Eliminó fotografía clínica", "fotos", p.lesionTag);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

function detectImageType(buffer: Buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { ext: "jpg", mime: "image/jpeg" };
  }
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { ext: "png", mime: "image/png" };
  }
  if (
    buffer.length >= 12
    && buffer.subarray(0, 4).toString("ascii") === "RIFF"
    && buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return { ext: "webp", mime: "image/webp" };
  }
  return null;
}

function guessMime(filename: string) {
  const ext = path.extname(filename).slice(1).toLowerCase();
  return ({
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
  } as Record<string, string>)[ext] ?? "application/octet-stream";
}

export default router;
