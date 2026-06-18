import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../db.js";
import { signToken } from "../lib/jwt.js";
import { requireAuth } from "../middleware/auth.js";
import { unauthorized, badRequest } from "../lib/errors.js";

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post("/login", async (req, res, next) => {
  try {
    const body = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: body.email } });
    if (!user) throw unauthorized("Credenciales inválidas");
    if (!user.active) throw unauthorized("Usuario inactivo");

    const ok = await bcrypt.compare(body.password, user.passwordHash);
    if (!ok) throw unauthorized("Credenciales inválidas");

    const token = signToken({ sub: user.id, email: user.email, role: user.role });
    await prisma.user.update({
      where: { id: user.id },
      data: { lastAccess: new Date() },
    });
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "Inició sesión",
        cat: "sesion",
        label: user.mfaEnabled ? "MFA verificado (demo)" : "Sesión iniciada",
        ip: req.ip ?? null,
      },
    });

    res.json({
      token,
      profile: serialize(user),
    });
  } catch (e) {
    next(e);
  }
});

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) throw unauthorized();
    res.json({ profile: serialize(user) });
  } catch (e) {
    next(e);
  }
});

router.post("/logout", requireAuth, async (req, res) => {
  await prisma.auditLog.create({
    data: { userId: req.user!.id, action: "Cerró sesión", cat: "sesion", ip: req.ip ?? null },
  });
  res.json({ ok: true });
});

type UserRow = NonNullable<Awaited<ReturnType<typeof prisma.user.findUnique>>>;
function serialize(u: UserRow) {
  const { passwordHash, ...rest } = u;
  return rest;
}

export default router;
