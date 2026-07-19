import type { Request, RequestHandler } from "express";
import { HttpError } from "../lib/errors.js";

interface RateLimitOptions {
  windowMs: number;
  max: number;
  key?: (req: Request) => string;
  message?: string;
}

interface Counter {
  count: number;
  resetsAt: number;
}

export function rateLimit(options: RateLimitOptions): RequestHandler {
  const counters = new Map<string, Counter>();
  return (req, res, next) => {
    const now = Date.now();
    const key = options.key?.(req) ?? req.ip ?? "unknown";
    let counter = counters.get(key);
    if (!counter || counter.resetsAt <= now) {
      counter = { count: 0, resetsAt: now + options.windowMs };
      counters.set(key, counter);
    }
    counter.count += 1;

    const retryAfter = Math.max(1, Math.ceil((counter.resetsAt - now) / 1000));
    res.setHeader("RateLimit-Limit", String(options.max));
    res.setHeader("RateLimit-Remaining", String(Math.max(0, options.max - counter.count)));
    res.setHeader("RateLimit-Reset", String(retryAfter));
    if (counter.count > options.max) {
      res.setHeader("Retry-After", String(retryAfter));
      return next(new HttpError(429, options.message ?? "Demasiados intentos; intenta mas tarde"));
    }

    if (counters.size > 10_000) {
      for (const [storedKey, stored] of counters) {
        if (stored.resetsAt <= now) counters.delete(storedKey);
      }
    }
    next();
  };
}

export function ipAndEmailKey(req: Request) {
  const email = typeof req.body?.email === "string"
    ? req.body.email.trim().toLowerCase()
    : typeof req.body?.adminEmail === "string"
      ? req.body.adminEmail.trim().toLowerCase()
      : "unknown";
  return `${req.ip ?? "unknown"}:${email}`;
}
