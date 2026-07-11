import type { RequestHandler } from "express";
import { env } from "../env.js";
import { unauthorized } from "../lib/errors.js";

export const requirePlatformKey: RequestHandler = (req, _res, next) => {
  const key = req.headers["x-platform-key"];
  if (!key || key !== env.PLATFORM_REGISTER_KEY) {
    return next(unauthorized("Platform key inválida o ausente"));
  }
  next();
};
