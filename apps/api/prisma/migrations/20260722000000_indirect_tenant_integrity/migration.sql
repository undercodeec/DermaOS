-- Segunda barrera multi-tenant para tablas clinicas que antes heredaban la
-- clinica solo mediante relaciones indirectas. El backfill ocurre dentro de
-- esta migracion y se aborta ante cualquier cruce historico.

ALTER TABLE "clinical_records" ADD COLUMN "clinic_id" UUID;
ALTER TABLE "photos" ADD COLUMN "clinic_id" UUID;
ALTER TABLE "consents" ADD COLUMN "clinic_id" UUID;
ALTER TABLE "consent_events" ADD COLUMN "clinic_id" UUID;
ALTER TABLE "procedures" ADD COLUMN "clinic_id" UUID;

ALTER TABLE "consents" DISABLE TRIGGER "consent_immutable_guard";
ALTER TABLE "consent_events" DISABLE TRIGGER "consent_events_append_only";

UPDATE "clinical_records" x SET "clinic_id" = p."clinic_id"
FROM "patients" p WHERE p."id" = x."patient_id";
UPDATE "photos" x SET "clinic_id" = p."clinic_id"
FROM "patients" p WHERE p."id" = x."patient_id";
UPDATE "consents" x SET "clinic_id" = p."clinic_id"
FROM "patients" p WHERE p."id" = x."patient_id";
UPDATE "procedures" x SET "clinic_id" = p."clinic_id"
FROM "patients" p WHERE p."id" = x."patient_id";
UPDATE "consent_events" x SET "clinic_id" = c."clinic_id"
FROM "consents" c WHERE c."id" = x."consent_id";

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "clinical_records" WHERE "clinic_id" IS NULL)
    THEN RAISE EXCEPTION 'Integridad multi-tenant: clinical_records sin clinica derivable'; END IF;
  IF EXISTS (SELECT 1 FROM "photos" WHERE "clinic_id" IS NULL)
    THEN RAISE EXCEPTION 'Integridad multi-tenant: photos sin clinica derivable'; END IF;
  IF EXISTS (SELECT 1 FROM "consents" WHERE "clinic_id" IS NULL)
    THEN RAISE EXCEPTION 'Integridad multi-tenant: consents sin clinica derivable'; END IF;
  IF EXISTS (SELECT 1 FROM "consent_events" WHERE "clinic_id" IS NULL)
    THEN RAISE EXCEPTION 'Integridad multi-tenant: consent_events sin clinica derivable'; END IF;
  IF EXISTS (SELECT 1 FROM "procedures" WHERE "clinic_id" IS NULL)
    THEN RAISE EXCEPTION 'Integridad multi-tenant: procedures sin clinica derivable'; END IF;

  IF EXISTS (
    SELECT 1 FROM "clinical_records" x JOIN "professionals" p ON p."id" = x."professional_id"
    WHERE x."clinic_id" <> p."clinic_id"
  ) THEN RAISE EXCEPTION 'Integridad multi-tenant: clinical_records.professional_id contiene cruces de clinica'; END IF;
  IF EXISTS (
    SELECT 1 FROM "photos" x JOIN "users" u ON u."id" = x."created_by"
    WHERE x."clinic_id" <> u."clinic_id"
  ) THEN RAISE EXCEPTION 'Integridad multi-tenant: photos.created_by contiene cruces de clinica'; END IF;
  IF EXISTS (
    SELECT 1 FROM "consents" x JOIN "consent_templates" t ON t."id" = x."template_id"
    WHERE x."clinic_id" <> t."clinic_id"
  ) THEN RAISE EXCEPTION 'Integridad multi-tenant: consents.template_id contiene cruces de clinica'; END IF;
  IF EXISTS (
    SELECT 1 FROM "consents" x JOIN "users" u ON u."id" IN (x."signed_by_user_id", x."revoked_by_user_id")
    WHERE x."clinic_id" <> u."clinic_id"
  ) THEN RAISE EXCEPTION 'Integridad multi-tenant: consents contiene responsables de otra clinica'; END IF;
  IF EXISTS (
    SELECT 1 FROM "consent_events" x JOIN "users" u ON u."id" = x."created_by_id"
    WHERE x."clinic_id" <> u."clinic_id"
  ) THEN RAISE EXCEPTION 'Integridad multi-tenant: consent_events.created_by_id contiene cruces de clinica'; END IF;
  IF EXISTS (
    SELECT 1 FROM "procedures" x JOIN "services" s ON s."id" = x."service_id"
    WHERE x."clinic_id" <> s."clinic_id"
  ) THEN RAISE EXCEPTION 'Integridad multi-tenant: procedures.service_id contiene cruces de clinica'; END IF;
  IF EXISTS (
    SELECT 1 FROM "procedures" x JOIN "professionals" p ON p."id" = x."professional_id"
    WHERE x."clinic_id" <> p."clinic_id"
  ) THEN RAISE EXCEPTION 'Integridad multi-tenant: procedures.professional_id contiene cruces de clinica'; END IF;
  IF EXISTS (
    SELECT 1 FROM "procedures" x JOIN "consents" c ON c."id" = x."consent_id"
    WHERE x."clinic_id" <> c."clinic_id" OR x."patient_id" <> c."patient_id"
  ) THEN RAISE EXCEPTION 'Integridad multi-tenant: procedures.consent_id no pertenece al paciente y clinica'; END IF;
  IF EXISTS (
    SELECT 1 FROM "procedures" x, unnest(x."photo_ids") photo_id
    LEFT JOIN "photos" p ON p."id" = photo_id
    WHERE p."id" IS NULL OR p."clinic_id" <> x."clinic_id" OR p."patient_id" <> x."patient_id"
  ) THEN RAISE EXCEPTION 'Integridad multi-tenant: procedures.photo_ids contiene fotos ajenas'; END IF;
END $$;

ALTER TABLE "clinical_records" ALTER COLUMN "clinic_id" SET NOT NULL;
ALTER TABLE "photos" ALTER COLUMN "clinic_id" SET NOT NULL;
ALTER TABLE "consents" ALTER COLUMN "clinic_id" SET NOT NULL;
ALTER TABLE "consent_events" ALTER COLUMN "clinic_id" SET NOT NULL;
ALTER TABLE "procedures" ALTER COLUMN "clinic_id" SET NOT NULL;

CREATE INDEX "clinical_records_clinic_id_idx" ON "clinical_records"("clinic_id");
CREATE INDEX "photos_clinic_id_idx" ON "photos"("clinic_id");
CREATE INDEX "consents_clinic_id_idx" ON "consents"("clinic_id");
CREATE INDEX "consent_events_clinic_id_idx" ON "consent_events"("clinic_id");
CREATE INDEX "procedures_clinic_id_idx" ON "procedures"("clinic_id");
CREATE UNIQUE INDEX "consent_templates_id_clinic_id_key" ON "consent_templates"("id", "clinic_id");
CREATE UNIQUE INDEX "consents_id_clinic_id_key" ON "consents"("id", "clinic_id");

ALTER TABLE "clinical_records"
  DROP CONSTRAINT "clinical_records_patient_id_fkey",
  DROP CONSTRAINT "clinical_records_professional_id_fkey",
  ADD CONSTRAINT "clinical_records_patient_same_clinic_fkey"
    FOREIGN KEY ("patient_id", "clinic_id") REFERENCES "patients"("id", "clinic_id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "clinical_records_professional_same_clinic_fkey"
    FOREIGN KEY ("professional_id", "clinic_id") REFERENCES "professionals"("id", "clinic_id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "clinical_records_clinic_id_fkey"
    FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "photos"
  DROP CONSTRAINT "photos_patient_id_fkey",
  ADD CONSTRAINT "photos_patient_same_clinic_fkey"
    FOREIGN KEY ("patient_id", "clinic_id") REFERENCES "patients"("id", "clinic_id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "photos_clinic_id_fkey"
    FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "consents"
  DROP CONSTRAINT "consents_patient_id_fkey",
  DROP CONSTRAINT "consents_template_id_fkey",
  ADD CONSTRAINT "consents_patient_same_clinic_fkey"
    FOREIGN KEY ("patient_id", "clinic_id") REFERENCES "patients"("id", "clinic_id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "consents_template_same_clinic_fkey"
    FOREIGN KEY ("template_id", "clinic_id") REFERENCES "consent_templates"("id", "clinic_id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "consents_clinic_id_fkey"
    FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "consent_events"
  DROP CONSTRAINT "consent_events_consent_id_fkey",
  ADD CONSTRAINT "consent_events_consent_same_clinic_fkey"
    FOREIGN KEY ("consent_id", "clinic_id") REFERENCES "consents"("id", "clinic_id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "consent_events_clinic_id_fkey"
    FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "procedures"
  DROP CONSTRAINT "procedures_patient_id_fkey",
  DROP CONSTRAINT "procedures_service_id_fkey",
  DROP CONSTRAINT "procedures_professional_id_fkey",
  ADD CONSTRAINT "procedures_patient_same_clinic_fkey"
    FOREIGN KEY ("patient_id", "clinic_id") REFERENCES "patients"("id", "clinic_id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "procedures_service_same_clinic_fkey"
    FOREIGN KEY ("service_id", "clinic_id") REFERENCES "services"("id", "clinic_id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "procedures_professional_same_clinic_fkey"
    FOREIGN KEY ("professional_id", "clinic_id") REFERENCES "professionals"("id", "clinic_id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "procedures_clinic_id_fkey"
    FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION enforce_photo_tenant_integrity() RETURNS trigger AS $$
BEGIN
  IF NEW."created_by" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "users" u WHERE u."id" = NEW."created_by" AND u."clinic_id" = NEW."clinic_id"
  ) THEN RAISE EXCEPTION 'Integridad multi-tenant: autor de foto pertenece a otra clinica'; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION enforce_consent_event_tenant_integrity() RETURNS trigger AS $$
BEGIN
  IF NEW."created_by_id" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "users" u WHERE u."id" = NEW."created_by_id" AND u."clinic_id" = NEW."clinic_id"
  ) THEN RAISE EXCEPTION 'Integridad multi-tenant: autor de evento pertenece a otra clinica'; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION enforce_consent_tenant_integrity() RETURNS trigger AS $$
BEGIN
  IF NEW."signed_by_user_id" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "users" u WHERE u."id" = NEW."signed_by_user_id" AND u."clinic_id" = NEW."clinic_id"
  ) THEN RAISE EXCEPTION 'Integridad multi-tenant: firmante pertenece a otra clinica'; END IF;
  IF NEW."revoked_by_user_id" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "users" u WHERE u."id" = NEW."revoked_by_user_id" AND u."clinic_id" = NEW."clinic_id"
  ) THEN RAISE EXCEPTION 'Integridad multi-tenant: revocador pertenece a otra clinica'; END IF;
  IF NEW."procedure_id" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "procedures" p WHERE p."id" = NEW."procedure_id" AND p."clinic_id" = NEW."clinic_id" AND p."patient_id" = NEW."patient_id"
  ) THEN RAISE EXCEPTION 'Integridad multi-tenant: procedimiento del consentimiento pertenece a otro paciente o clinica'; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION enforce_procedure_tenant_integrity() RETURNS trigger AS $$
BEGIN
  IF NEW."consent_id" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "consents" c WHERE c."id" = NEW."consent_id" AND c."clinic_id" = NEW."clinic_id" AND c."patient_id" = NEW."patient_id"
  ) THEN RAISE EXCEPTION 'Integridad multi-tenant: consentimiento del procedimiento pertenece a otro paciente o clinica'; END IF;
  IF EXISTS (
    SELECT 1 FROM unnest(NEW."photo_ids") photo_id LEFT JOIN "photos" p ON p."id" = photo_id
    WHERE p."id" IS NULL OR p."clinic_id" <> NEW."clinic_id" OR p."patient_id" <> NEW."patient_id"
  ) THEN RAISE EXCEPTION 'Integridad multi-tenant: foto del procedimiento pertenece a otro paciente o clinica'; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "photo_tenant_guard" BEFORE INSERT OR UPDATE ON "photos"
FOR EACH ROW EXECUTE FUNCTION enforce_photo_tenant_integrity();
CREATE TRIGGER "consent_tenant_guard" BEFORE INSERT OR UPDATE ON "consents"
FOR EACH ROW EXECUTE FUNCTION enforce_consent_tenant_integrity();
CREATE TRIGGER "consent_event_tenant_guard" BEFORE INSERT OR UPDATE ON "consent_events"
FOR EACH ROW EXECUTE FUNCTION enforce_consent_event_tenant_integrity();
CREATE TRIGGER "procedure_tenant_guard" BEFORE INSERT OR UPDATE ON "procedures"
FOR EACH ROW EXECUTE FUNCTION enforce_procedure_tenant_integrity();

ALTER TABLE "consents" ENABLE TRIGGER "consent_immutable_guard";
ALTER TABLE "consent_events" ENABLE TRIGGER "consent_events_append_only";
