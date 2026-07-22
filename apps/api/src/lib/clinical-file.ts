import { z } from "zod";
import type { ModuleId } from "./permissions.js";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha invalida").refine(
  (value) => {
    const parsed = new Date(`${value}T00:00:00-05:00`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  },
  "Fecha invalida",
);

const includedByDefault = z.enum(["0", "1"]).default("1").transform((value) => value === "1");

export const clinicalFileQuerySchema = z.object({
  from: isoDate.optional(),
  to: isoDate.optional(),
  includeEvolutions: includedByDefault,
  includePrescriptions: includedByDefault,
  includeProcedures: includedByDefault,
  includeConsents: includedByDefault,
  includePhotos: z.enum(["0", "1"]).default("0").transform((value) => value === "1"),
  signerProfessionalId: z.string().uuid().optional(),
  purpose: z.enum(["preview", "print"]).default("preview"),
}).superRefine((value, ctx) => {
  if (value.from && value.to && value.from > value.to) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["to"],
      message: "La fecha final no puede ser anterior a la inicial",
    });
  }
});

export type ClinicalFileQuery = z.infer<typeof clinicalFileQuerySchema>;

export function clinicalFileDateRange(query: Pick<ClinicalFileQuery, "from" | "to">) {
  const range: { gte?: Date; lt?: Date } = {};
  if (query.from) range.gte = new Date(`${query.from}T00:00:00-05:00`);
  if (query.to) range.lt = new Date(new Date(`${query.to}T00:00:00-05:00`).getTime() + 86_400_000);
  return range;
}

export function clinicalFileRequiredModules(query: ClinicalFileQuery): ModuleId[] {
  const modules = new Set<ModuleId>();
  if (query.includeEvolutions || query.includePrescriptions) modules.add("historia");
  if (query.includeProcedures) modules.add("procedimientos");
  if (query.includeConsents) modules.add("consentimientos");
  if (query.includePhotos) modules.add("fotos");
  return [...modules];
}
