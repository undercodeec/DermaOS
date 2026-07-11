import { Router } from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs/promises";
import { createReadStream } from "node:fs";
import { z } from "zod";
import { prisma } from "../db.js";
import { env } from "../env.js";
import { requireAuth, requireModule } from "../middleware/auth.js";
import { audit } from "../lib/audit.js";
import { badRequest, forbidden, notFound } from "../lib/errors.js";

const router = Router();
router.use(requireAuth);

const PHOTO_DIR = path.resolve(env.UPLOAD_DIR, "patient-photos");
await fs.mkdir(PHOTO_DIR, { recursive: true });

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

router.post(
  "/",
  requireModule("fotos", "write"),
  upload.single("file"),
  async (req, res, next) => {
    try {
      if (!req.file) throw badRequest("Falta archivo");
      const meta = metaSchema.parse(req.body);

      // Verifica que el paciente pertenece a esta clínica
      const patient = await prisma.patient.findFirst({
        where: { id: meta.patient_id, clinicId: req.user!.clinicId },
      });
      if (!patient) throw badRequest("Paciente no encontrado");

      const ext = (req.file.mimetype.split("/")[1] ?? "bin").toLowerCase();
      const filename = `${Date.now()}_${cryptoRandom(8)}.${ext}`;
      const filepath = path.join(PHOTO_DIR, filename);
      await fs.writeFile(filepath, req.file.buffer);

      const photo = await prisma.photo.create({
        data: {
          patientId: meta.patient_id,
          bodyArea: meta.body_area,
          lesionTag: meta.lesion_tag,
          caption: meta.caption,
          kind: meta.kind,
          storagePath: filename,
          createdById: req.user!.id,
        },
      });
      await audit(req, "Subió fotografía clínica", "fotos", `${meta.lesion_tag}`);
      res.status(201).json(photo);
    } catch (e) {
      next(e);
    }
  },
);

// Sirve el binario protegido por JWT
router.get("/:id/file", requireModule("fotos"), async (req, res, next) => {
  try {
    const p = await prisma.photo.findUnique({
      where: { id: req.params.id },
      include: { patient: { select: { clinicId: true } } },
    });
    if (!p) throw notFound("Foto no existe");
    if (p.patient.clinicId !== req.user!.clinicId) throw forbidden();
    const full = path.join(PHOTO_DIR, p.storagePath);
    if (!isInside(full, PHOTO_DIR)) throw notFound();
    await audit(req, "Visualizó fotografía clínica", "fotos", p.lesionTag);
    res.setHeader("Content-Type", guessMime(p.storagePath));
    createReadStream(full).pipe(res);
  } catch (e) {
    next(e);
  }
});

router.delete("/:id", requireModule("fotos", "write"), async (req, res, next) => {
  try {
    const p = await prisma.photo.findUnique({
      where: { id: req.params.id },
      include: { patient: { select: { clinicId: true } } },
    });
    if (!p) throw notFound();
    if (p.patient.clinicId !== req.user!.clinicId) throw forbidden();
    if (req.user!.role !== "admin") return next(notFound());
    await prisma.photo.delete({ where: { id: p.id } });
    await fs.unlink(path.join(PHOTO_DIR, p.storagePath)).catch(() => {});
    await audit(req, "Eliminó fotografía clínica", "fotos", p.lesionTag);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

function cryptoRandom(n: number) {
  return Array.from({ length: n }, () => Math.floor(Math.random() * 36).toString(36)).join("");
}

function isInside(child: string, parent: string) {
  const rel = path.relative(parent, child);
  return !rel.startsWith("..") && !path.isAbsolute(rel);
}

function guessMime(filename: string) {
  const ext = path.extname(filename).slice(1).toLowerCase();
  return ({
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
  } as Record<string, string>)[ext] ?? "application/octet-stream";
}

export default router;
