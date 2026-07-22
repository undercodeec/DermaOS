import "dotenv/config";
import { z } from "zod";

const booleanFromEnv = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  if (value.toLowerCase() === "true") return true;
  if (value.toLowerCase() === "false") return false;
  return value;
}, z.boolean());
const optionalNonEmptyString = z.preprocess(
  (value) => value === "" ? undefined : value,
  z.string().min(1).optional(),
);
const optionalEmail = z.preprocess(
  (value) => value === "" ? undefined : value,
  z.string().email().optional(),
);

// Conserva compatibilidad con los nombres ya usados en despliegues anteriores.
const environment = {
  ...process.env,
  PLATFORM_PAYPHONE_TOKEN: process.env.PLATFORM_PAYPHONE_TOKEN || process.env.PAYPHONE_TOKEN,
  PLATFORM_PAYPHONE_STORE_ID: process.env.PLATFORM_PAYPHONE_STORE_ID || process.env.PAYPHONE_STORE_ID,
  SMTP_HOST: process.env.SMTP_HOST || process.env.EMAIL_HOST,
  SMTP_PORT: process.env.SMTP_PORT || process.env.EMAIL_PORT,
  SMTP_USER: process.env.SMTP_USER || process.env.EMAIL_USER,
  SMTP_PASS: process.env.SMTP_PASS || process.env.EMAIL_PASSWORD,
  SMTP_FROM: process.env.SMTP_FROM || process.env.EMAIL_BUSINESS || process.env.ADMIN_EMAIL,
};

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(16, "JWT_SECRET debe tener ≥ 16 chars"),
  JWT_EXPIRES_IN: z.string().default("12h"),
  UPLOAD_DIR: z.string().default("uploads"),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  PORT: z.coerce.number().default(4000),
  PLATFORM_REGISTER_KEY: z.string().min(32, "PLATFORM_REGISTER_KEY debe tener ≥ 32 chars"),
  PLATFORM_ADMIN_EMAIL: z.string().email().default("gerencia@undercodeec.com"),
  PLATFORM_ADMIN_PASSWORD: z.string().optional(),
  PLATFORM_JWT_SECRET: z.string().min(32).optional(),
  INVOICES_ENABLED: booleanFromEnv.default(false),
  PAYPHONE_CREDENTIAL_KEY: z.string().min(32).optional(),
  PAYPHONE_API_BASE: z.string().url().default("https://pay.payphonetodoesposible.com/api"),
  PLATFORM_PAYPHONE_TOKEN: z.string().optional(),
  PLATFORM_PAYPHONE_STORE_ID: z.string().optional(),
  PLATFORM_SUBSCRIPTION_MONTHLY_AMOUNT: z.coerce.number().positive().default(49),
  AUTH_EMAIL_CODE_TTL_MINUTES: z.coerce.number().int().positive().default(10),
  PHOTO_STORAGE_PROVIDER: z.enum(["local", "supabase"]).default("local"),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  SUPABASE_PHOTO_BUCKET: z.string().min(3).default("clinical-photos"),
  SMTP_HOST: optionalNonEmptyString,
  SMTP_PORT: z.coerce.number().int().positive().default(465),
  SMTP_USER: optionalNonEmptyString,
  SMTP_PASS: optionalNonEmptyString,
  SMTP_FROM: optionalEmail,
  AUTH_EMAIL_SUBJECT: z.string().default("Tu codigo de acceso a DERMA-OS"),
}).superRefine((value, ctx) => {
  if (value.NODE_ENV !== "production") return;
  if (value.JWT_SECRET.length < 32) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["JWT_SECRET"], message: "debe tener al menos 32 caracteres en produccion" });
  }
  if (!value.PLATFORM_ADMIN_PASSWORD || value.PLATFORM_ADMIN_PASSWORD.length < 12) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["PLATFORM_ADMIN_PASSWORD"], message: "debe tener al menos 12 caracteres en produccion" });
  }
  if (!value.PLATFORM_JWT_SECRET) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["PLATFORM_JWT_SECRET"], message: "es obligatorio en produccion" });
  }
  if (!value.PAYPHONE_CREDENTIAL_KEY) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["PAYPHONE_CREDENTIAL_KEY"], message: "es obligatoria en produccion" });
  }
  if (!value.SMTP_HOST || !value.SMTP_USER || !value.SMTP_PASS || !value.SMTP_FROM) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["SMTP_HOST"],
      message: "SMTP_HOST, SMTP_USER, SMTP_PASS y SMTP_FROM son obligatorias en produccion",
    });
  }
  if (value.PHOTO_STORAGE_PROVIDER === "supabase" && (!value.SUPABASE_URL || !value.SUPABASE_SERVICE_ROLE_KEY)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["SUPABASE_URL"], message: "SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son obligatorias para fotos en Supabase" });
  }
});

export const env = schema.parse(environment);
export type Env = z.infer<typeof schema>;
