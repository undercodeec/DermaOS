CREATE TYPE "ReportNoteStatus" AS ENUM ('abierta', 'resuelta');

CREATE TABLE "report_notes" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "clinic_id" UUID NOT NULL,
  "created_by_id" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT,
  "metric_key" TEXT,
  "period_from" DATE,
  "period_to" DATE,
  "status" "ReportNoteStatus" NOT NULL DEFAULT 'abierta',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolved_at" TIMESTAMPTZ,
  CONSTRAINT "report_notes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "report_notes_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "report_notes_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "report_notes_clinic_id_status_created_at_idx" ON "report_notes"("clinic_id", "status", "created_at");
