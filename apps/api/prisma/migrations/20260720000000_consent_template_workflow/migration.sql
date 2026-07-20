CREATE TYPE "ConsentTemplateStatus" AS ENUM ('borrador', 'aprobada', 'archivada');

ALTER TABLE "clinics" ADD COLUMN "logo_data" TEXT;

ALTER TABLE "consent_templates"
  ADD COLUMN "status" "ConsentTemplateStatus" NOT NULL DEFAULT 'borrador',
  ADD COLUMN "series_id" UUID NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "source_name" TEXT,
  ADD COLUMN "source_mime" TEXT,
  ADD COLUMN "source_sha256" TEXT,
  ADD COLUMN "source_file" BYTEA,
  ADD COLUMN "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "approved_at" TIMESTAMPTZ;

-- Las plantillas existentes ya estaban disponibles para uso; se conservan como aprobadas.
UPDATE "consent_templates" SET "status" = 'aprobada', "approved_at" = CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX "consent_templates_clinic_id_series_id_version_key"
  ON "consent_templates"("clinic_id", "series_id", "version");

ALTER TABLE "consents"
  ADD COLUMN "template_title" TEXT,
  ADD COLUMN "template_body" TEXT,
  ADD COLUMN "template_kind" "ConsentKind",
  ADD COLUMN "template_version" INTEGER,
  ADD COLUMN "signed_ip" TEXT;

-- Congela el texto de consentimientos históricos para que futuras ediciones no los alteren.
UPDATE "consents" c
SET "template_title" = t."title",
    "template_body" = t."body",
    "template_kind" = t."kind",
    "template_version" = t."version"
FROM "consent_templates" t
WHERE c."template_id" = t."id";
