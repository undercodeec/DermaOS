import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
  }
}

export const badRequest    = (m: string) => new HttpError(400, m);
export const unauthorized  = (m = "No autenticado") => new HttpError(401, m);
export const forbidden     = (m = "No autorizado") => new HttpError(403, m);
export const notFound      = (m = "No encontrado") => new HttpError(404, m);
export const conflict      = (m: string) => new HttpError(409, m);

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: "Datos inválidos", details: err.flatten() });
  }
  if (err instanceof HttpError) {
    return res.status(err.statusCode).json({ error: err.message });
  }
  console.error("[api] unhandled", err);
  res.status(500).json({ error: "Error interno" });
}
