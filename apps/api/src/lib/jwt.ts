import jwt from "jsonwebtoken";
import { env } from "../env.js";
import type { Role } from "@prisma/client";

export interface TokenPayload {
  sub: string;
  email: string;
  role: Role;
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN } as jwt.SignOptions);
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, env.JWT_SECRET) as TokenPayload;
}
