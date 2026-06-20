import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../db.js";
import { signToken } from "../lib/jwt.js";
import { requireAuth } from "../middleware/auth.js";
import { unauthorized } from "../lib/errors.js";
import { generateSecretBase32, otpauthUrl, verifyTotp } from "../lib/totp.js";

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  totpCode: z.string().regex(/^\d{6}$/).optional(),
});

router.post("/login", async (req, res, next) => {
  try {
    const body = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: body.email } });
    if (!user) throw unauthorized("Credenciales inválidas");
    if (!user.active) throw unauthorized("Usuario inactivo");

    const ok = await bcrypt.compare(body.password, user.passwordHash);
    if (!ok) throw unauthorized("Credenciales inválidas");

    if (user.mfaEnabled) {
      if (!user.mfaSecret) {
        const secret = generateSecretBase32();
        await prisma.user.update({ where: { id: user.id }, data: { mfaSecret: secret } });
        return res.status(200).json({
          mfaSetup: true,
          secret,
          otpauthUrl: otpauthUrl(secret, user.email),
        });
      }
      if (!body.totpCode) {
        return res.status(200).json({ mfaRequired: true });
      }
      if (!verifyTotp(user.mfaSecret, body.totpCode)) {
        await prisma.auditLog.create({
          data: {
            userId: user.id,
            action: "Intento de inicio de sesión denegado",
            cat: "sesion",
            label: "Código MFA inválido",
            ip: req.ip ?? null,
          },
        });
        throw unauthorized("Código MFA inválido");
      }
    }

    const token = signToken({ sub: user.id, email: user.email, role: user.role });
    await prisma.user.update({ where: { id: user.id }, data: { lastAccess: new Date() } });
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "Inició sesión",
        cat: "sesion",
        label: user.mfaEnabled ? "MFA verificado" : "Sesión iniciada",
        ip: req.ip ?? null,
      },
    });

    res.json({ token, profile: serialize(user) });
  } catch (e) {
    next(e);
  }
});

const verifySetupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  totpCode: z.string().regex(/^\d{6}$/),
});

router.post("/mfa/verify-setup", async (req, res, next) => {
  try {
    const body = verifySetupSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: body.email } });
    if (!user || !user.active) throw unauthorized("Credenciales inválidas");
    const ok = await bcrypt.compare(body.password, user.passwordHash);
    if (!ok) throw unauthorized("Credenciales inválidas");
    if (!user.mfaSecret) throw unauthorized("Setup MFA no iniciado");
    if (!verifyTotp(user.mfaSecret, body.totpCode)) throw unauthorized("Código MFA inválido");
    const token = signToken({ sub: user.id, email: user.email, role: user.role });
    await prisma.user.update({ where: { id: user.id }, data: { lastAccess: new Date() } });
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "Configuró MFA y entró",
        cat: "sesion",
        label: "MFA inicial vinculado",
        ip: req.ip ?? null,
      },
    });
    res.json({ token, profile: serialize(user) });
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
  const { passwordHash, mfaSecret, ...rest } = u;
  void passwordHash;
  void mfaSecret;
  return rest;
}

export default router;
