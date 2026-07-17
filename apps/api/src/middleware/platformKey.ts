import type { RequestHandler } from "express";
import crypto from "node:crypto";
import { env } from "../env.js";
import { unauthorized } from "../lib/errors.js";

function sameSecret(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export const requirePlatformKey: RequestHandler = (req, _res, next) => {
  const raw = req.headers["x-platform-key"];
  const key = Array.isArray(raw) ? "" : raw;
  if (!key || !sameSecret(key, env.PLATFORM_REGISTER_KEY)) {
    return next(unauthorized("Platform key invalida o ausente"));
  }
  next();
};
