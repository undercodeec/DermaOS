import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../db.js";
import { signToken } from "../lib/jwt.js";
import { conflict } from "../lib/errors.js";
import { requirePlatformKey } from "../middleware/platformKey.js";

const router = Router();

const registerSchema = z.object({
  clinicName: z.string().min(2),
  ruc:        z.string().optional(),
  adminName:  z.string().min(2),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(8),
});

// POST /clinics/register — crea clínica + usuario admin en una transacción
router.post("/register", requirePlatformKey, async (req, res, next) => {
  try {
    const b = registerSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email: b.adminEmail } });
    if (existing) throw conflict("El email ya está registrado");

    const hash = await bcrypt.hash(b.adminPassword, 12);

    const result = await prisma.$transaction(async (tx) => {
      const clinic = await tx.clinic.create({
        data: { name: b.clinicName, ruc: b.ruc ?? null },
      });
      const user = await tx.user.create({
        data: {
          clinicId:     clinic.id,
          fullName:     b.adminName,
          email:        b.adminEmail,
          passwordHash: hash,
          role:         "admin",
          mfaEnabled:   false,
          active:       true,
        },
      });
      return { clinic, user };
    });

    await prisma.auditLog.create({
      data: {
        clinicId: result.clinic.id,
        userId:   result.user.id,
        action:   "clinic.register",
        cat:      "sistema",
        label:    result.clinic.name,
        ip:       req.ip ?? null,
      },
    });

    const token = signToken({
      sub:      result.user.id,
      email:    result.user.email,
      role:     result.user.role,
      clinicId: result.clinic.id,
    });

    res.status(201).json({
      token,
      clinic: { id: result.clinic.id, name: result.clinic.name },
      profile: {
        id:       result.user.id,
        fullName: result.user.fullName,
        email:    result.user.email,
        role:     result.user.role,
        clinicId: result.clinic.id,
      },
    });
  } catch (e) {
    next(e);
  }
});

export default router;
