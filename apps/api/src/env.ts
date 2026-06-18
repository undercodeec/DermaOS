import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(16, "JWT_SECRET debe tener ≥ 16 chars"),
  JWT_EXPIRES_IN: z.string().default("12h"),
  UPLOAD_DIR: z.string().default("uploads"),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  PORT: z.coerce.number().default(4000),
});

export const env = schema.parse(process.env);
export type Env = z.infer<typeof schema>;
