import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { audit } from "../lib/audit.js";
import { notFound } from "../lib/errors.js";

const router = Router();
router.use(requireAuth, requireRole("admin"));

router.get("/users", async (_req, res, next) => {
  try {
    const list = await prisma.user.findMany({
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

const patchUserSchema = z.object({
  active: z.boolean().optional(),
  mfaEnabled: z.boolean().optional(),
  role: z.enum(["admin", "recepcion", "profesional", "esteticista", "contador"]).optional(),
});

router.patch("/users/:id", async (req, res, next) => {
  try {
    const cur = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!cur) throw notFound("Usuario no encontrado");
    const b = patchUserSchema.parse(req.body);
    const u = await prisma.user.update({
      where: { id: cur.id },
      data: {
        active: b.active ?? cur.active,
        mfaEnabled: b.mfaEnabled ?? cur.mfaEnabled,
        role: b.role ?? cur.role,
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
    if (b.active !== undefined && b.active !== cur.active) changes.push(b.active ? "activado" : "desactivado");
    if (b.mfaEnabled !== undefined && b.mfaEnabled !== cur.mfaEnabled) changes.push(`MFA ${b.mfaEnabled ? "activado" : "desactivado"}`);
    if (b.role && b.role !== cur.role) changes.push(`rol → ${b.role}`);
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

router.get("/audit-logs", async (req, res, next) => {
  try {
    const { cat, from, to, take } = req.query as Record<string, string>;
    const where: Record<string, unknown> = {};
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
