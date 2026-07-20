CREATE TYPE "ConsentEventKind" AS ENUM ('adenda', 'correccion', 'revocacion');

ALTER TABLE "consent_templates"
  ADD COLUMN "allowed_roles" "Role"[] NOT NULL DEFAULT ARRAY['admin', 'profesional']::"Role"[];

ALTER TABLE "consents"
  ADD COLUMN "signed_user_agent" TEXT,
  ADD COLUMN "signed_by_user_id" UUID,
  ADD COLUMN "signed_by_user_name" TEXT,
  ADD COLUMN "patient_name" TEXT,
  ADD COLUMN "patient_id_type" TEXT,
  ADD COLUMN "patient_id_number" TEXT,
  ADD COLUMN "patient_birth_date" DATE,
  ADD COLUMN "clinic_name" TEXT,
  ADD COLUMN "clinic_ruc" TEXT,
  ADD COLUMN "content_hash" TEXT,
  ADD COLUMN "signature_hash" TEXT,
  ADD COLUMN "pdf_hash" TEXT,
  ADD COLUMN "final_pdf" BYTEA,
  ADD COLUMN "revoked_at" TIMESTAMPTZ,
  ADD COLUMN "revocation_reason" TEXT,
  ADD COLUMN "revoked_by_user_id" UUID;

UPDATE "consents" c
SET "patient_name" = CONCAT_WS(' ', p."first_name", p."last_name"),
    "patient_id_type" = p."id_type",
    "patient_id_number" = p."id_number",
    "patient_birth_date" = p."birth_date",
    "clinic_name" = cl."name",
    "clinic_ruc" = cl."ruc"
FROM "patients" p
JOIN "clinics" cl ON cl."id" = p."clinic_id"
WHERE c."patient_id" = p."id";

CREATE TABLE "consent_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "consent_id" UUID NOT NULL,
  "kind" "ConsentEventKind" NOT NULL,
  "body" TEXT NOT NULL,
  "created_by_id" UUID,
  "created_by_name" TEXT NOT NULL,
  "at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ip" TEXT,
  "previous_hash" TEXT,
  "chain_sequence" INTEGER NOT NULL,
  "hash" TEXT NOT NULL,
  CONSTRAINT "consent_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "consent_events_consent_id_fkey" FOREIGN KEY ("consent_id") REFERENCES "consents"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "consent_events_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "consent_events_consent_id_at_idx" ON "consent_events"("consent_id", "at");
CREATE UNIQUE INDEX "consent_events_consent_id_chain_sequence_key" ON "consent_events"("consent_id", "chain_sequence");

ALTER TABLE "audit_logs"
  ADD COLUMN "previous_hash" TEXT,
  ADD COLUMN "entry_hash" TEXT,
  ADD COLUMN "chain_sequence" INTEGER;
CREATE UNIQUE INDEX "audit_logs_clinic_id_chain_sequence_key" ON "audit_logs"("clinic_id", "chain_sequence");

CREATE OR REPLACE FUNCTION prevent_signed_consent_mutation() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' AND OLD."status" IN ('firmado', 'revocado') THEN
    RAISE EXCEPTION 'Los consentimientos firmados o revocados son inmutables';
  END IF;

  IF TG_OP = 'UPDATE' AND OLD."status" = 'revocado' THEN
    RAISE EXCEPTION 'Los consentimientos revocados son inmutables';
  END IF;

  IF TG_OP = 'UPDATE' AND OLD."status" = 'firmado' THEN
    IF NEW."status" = 'revocado'
       AND NEW."revoked_at" IS NOT NULL
       AND NEW."revocation_reason" IS NOT NULL
       AND NEW."template_title" IS NOT DISTINCT FROM OLD."template_title"
       AND NEW."template_body" IS NOT DISTINCT FROM OLD."template_body"
       AND NEW."template_kind" IS NOT DISTINCT FROM OLD."template_kind"
       AND NEW."template_version" IS NOT DISTINCT FROM OLD."template_version"
       AND NEW."signature_path" IS NOT DISTINCT FROM OLD."signature_path"
       AND NEW."signed_at" IS NOT DISTINCT FROM OLD."signed_at"
       AND NEW."content_hash" IS NOT DISTINCT FROM OLD."content_hash"
       AND NEW."signature_hash" IS NOT DISTINCT FROM OLD."signature_hash"
       AND NEW."pdf_hash" IS NOT DISTINCT FROM OLD."pdf_hash"
       AND NEW."final_pdf" IS NOT DISTINCT FROM OLD."final_pdf"
       AND NEW."patient_id" IS NOT DISTINCT FROM OLD."patient_id"
       AND NEW."template_id" IS NOT DISTINCT FROM OLD."template_id"
       AND NEW."procedure_id" IS NOT DISTINCT FROM OLD."procedure_id"
       AND NEW."patient_name" IS NOT DISTINCT FROM OLD."patient_name"
       AND NEW."patient_id_type" IS NOT DISTINCT FROM OLD."patient_id_type"
       AND NEW."patient_id_number" IS NOT DISTINCT FROM OLD."patient_id_number"
       AND NEW."patient_birth_date" IS NOT DISTINCT FROM OLD."patient_birth_date"
       AND NEW."clinic_name" IS NOT DISTINCT FROM OLD."clinic_name"
       AND NEW."clinic_ruc" IS NOT DISTINCT FROM OLD."clinic_ruc"
       AND NEW."signed_ip" IS NOT DISTINCT FROM OLD."signed_ip"
       AND NEW."signed_user_agent" IS NOT DISTINCT FROM OLD."signed_user_agent"
       AND NEW."signed_by_user_id" IS NOT DISTINCT FROM OLD."signed_by_user_id"
       AND NEW."signed_by_user_name" IS NOT DISTINCT FROM OLD."signed_by_user_name" THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'El contenido de un consentimiento firmado es inmutable';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER consent_immutable_guard
BEFORE UPDATE OR DELETE ON "consents"
FOR EACH ROW EXECUTE FUNCTION prevent_signed_consent_mutation();

CREATE OR REPLACE FUNCTION prevent_approved_template_mutation() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' AND OLD."status" <> 'borrador' THEN
    RAISE EXCEPTION 'Las plantillas aprobadas o archivadas no se eliminan';
  END IF;
  IF TG_OP = 'UPDATE' AND OLD."status" IN ('aprobada', 'archivada') THEN
    IF (OLD."status" = 'aprobada' AND NEW."status" NOT IN ('aprobada', 'archivada'))
       OR (OLD."status" = 'archivada' AND NEW."status" <> 'archivada') THEN
      RAISE EXCEPTION 'Transicion de estado de plantilla no permitida';
    END IF;
    IF NEW."title" IS DISTINCT FROM OLD."title"
       OR NEW."body" IS DISTINCT FROM OLD."body"
       OR NEW."kind" IS DISTINCT FROM OLD."kind"
       OR NEW."procedure_type" IS DISTINCT FROM OLD."procedure_type"
       OR NEW."version" IS DISTINCT FROM OLD."version"
       OR NEW."series_id" IS DISTINCT FROM OLD."series_id"
       OR NEW."source_sha256" IS DISTINCT FROM OLD."source_sha256"
       OR NEW."source_file" IS DISTINCT FROM OLD."source_file"
       OR NEW."allowed_roles" IS DISTINCT FROM OLD."allowed_roles" THEN
      RAISE EXCEPTION 'El contenido de una plantilla aprobada es inmutable';
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER consent_template_immutable_guard
BEFORE UPDATE OR DELETE ON "consent_templates"
FOR EACH ROW EXECUTE FUNCTION prevent_approved_template_mutation();

CREATE OR REPLACE FUNCTION prevent_append_only_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Este registro de auditoria es de solo adicion';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER consent_events_append_only
BEFORE UPDATE OR DELETE ON "consent_events"
FOR EACH ROW EXECUTE FUNCTION prevent_append_only_mutation();

CREATE TRIGGER audit_logs_append_only
BEFORE UPDATE OR DELETE ON "audit_logs"
FOR EACH ROW EXECUTE FUNCTION prevent_append_only_mutation();
