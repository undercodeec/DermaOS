import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(16, "JWT_SECRET debe tener ≥ 16 chars"),
  JWT_EXPIRES_IN: z.string().default("12h"),
  UPLOAD_DIR: z.string().default("uploads"),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  PORT: z.coerce.number().default(4000),
  PLATFORM_REGISTER_KEY: z.string().min(32, "PLATFORM_REGISTER_KEY debe tener ≥ 32 chars"),
  INVOICES_ENABLED: z.coerce.boolean().default(false),
  PAYPHONE_CREDENTIAL_KEY: z.string().min(32).optional(),
  PAYPHONE_API_BASE: z.string().url().default("https://pay.payphonetodoesposible.com/api"),
  PLATFORM_PAYPHONE_TOKEN: z.string().optional(),
  PLATFORM_PAYPHONE_STORE_ID: z.string().optional(),
  PLATFORM_SUBSCRIPTION_MONTHLY_AMOUNT: z.coerce.number().positive().default(49),
  AUTH_EMAIL_CODE_TTL_MINUTES: z.coerce.number().int().positive().default(10),
  SMTP_HOST: z.string().min(1).optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(465),
  SMTP_USER: z.string().min(1).optional(),
  SMTP_PASS: z.string().min(1).optional(),
  SMTP_FROM: z.string().email().optional(),
  AUTH_EMAIL_SUBJECT: z.string().default("Tu codigo de acceso a DERMA-OS"),
});

export const env = schema.parse(process.env);
export type Env = z.infer<typeof schema>;
