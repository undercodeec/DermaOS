-- Segunda barrera multi-tenant para relaciones que contienen clinic_id.
-- La migracion se detiene con un mensaje claro si descubre cruces historicos;
-- no deja restricciones parcialmente validadas en una base de produccion.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "appointments" a JOIN "patients" p ON p."id" = a."patient_id"
    WHERE a."clinic_id" <> p."clinic_id"
  ) THEN RAISE EXCEPTION 'Integridad multi-tenant: appointments.patient_id contiene cruces de clinica'; END IF;
  IF EXISTS (
    SELECT 1 FROM "appointments" a JOIN "services" s ON s."id" = a."service_id"
    WHERE a."clinic_id" <> s."clinic_id"
  ) THEN RAISE EXCEPTION 'Integridad multi-tenant: appointments.service_id contiene cruces de clinica'; END IF;
  IF EXISTS (
    SELECT 1 FROM "appointments" a JOIN "professionals" p ON p."id" = a."professional_id"
    WHERE a."clinic_id" <> p."clinic_id"
  ) THEN RAISE EXCEPTION 'Integridad multi-tenant: appointments.professional_id contiene cruces de clinica'; END IF;
  IF EXISTS (
    SELECT 1 FROM "packages" p JOIN "services" s ON s."id" = p."service_id"
    WHERE p."clinic_id" <> s."clinic_id"
  ) THEN RAISE EXCEPTION 'Integridad multi-tenant: packages.service_id contiene cruces de clinica'; END IF;
  IF EXISTS (
    SELECT 1 FROM "package_balances" b JOIN "patients" p ON p."id" = b."patient_id"
    WHERE b."clinic_id" <> p."clinic_id"
  ) THEN RAISE EXCEPTION 'Integridad multi-tenant: package_balances.patient_id contiene cruces de clinica'; END IF;
  IF EXISTS (
    SELECT 1 FROM "package_balances" b JOIN "packages" p ON p."id" = b."package_id"
    WHERE b."clinic_id" <> p."clinic_id"
  ) THEN RAISE EXCEPTION 'Integridad multi-tenant: package_balances.package_id contiene cruces de clinica'; END IF;
  IF EXISTS (
    SELECT 1 FROM "payments" x JOIN "patients" p ON p."id" = x."patient_id"
    WHERE x."clinic_id" <> p."clinic_id"
  ) THEN RAISE EXCEPTION 'Integridad multi-tenant: payments.patient_id contiene cruces de clinica'; END IF;
END $$;

CREATE UNIQUE INDEX "patients_id_clinic_id_key" ON "patients"("id", "clinic_id");
CREATE UNIQUE INDEX "services_id_clinic_id_key" ON "services"("id", "clinic_id");
CREATE UNIQUE INDEX "professionals_id_clinic_id_key" ON "professionals"("id", "clinic_id");
CREATE UNIQUE INDEX "packages_id_clinic_id_key" ON "packages"("id", "clinic_id");

ALTER TABLE "appointments"
  DROP CONSTRAINT "appointments_patient_id_fkey",
  DROP CONSTRAINT "appointments_service_id_fkey",
  DROP CONSTRAINT "appointments_professional_id_fkey",
  ADD CONSTRAINT "appointments_patient_same_clinic_fkey"
    FOREIGN KEY ("patient_id", "clinic_id") REFERENCES "patients"("id", "clinic_id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "appointments_service_same_clinic_fkey"
    FOREIGN KEY ("service_id", "clinic_id") REFERENCES "services"("id", "clinic_id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "appointments_professional_same_clinic_fkey"
    FOREIGN KEY ("professional_id", "clinic_id") REFERENCES "professionals"("id", "clinic_id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "packages"
  DROP CONSTRAINT "packages_service_id_fkey",
  ADD CONSTRAINT "packages_service_same_clinic_fkey"
    FOREIGN KEY ("service_id", "clinic_id") REFERENCES "services"("id", "clinic_id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "package_balances"
  DROP CONSTRAINT "package_balances_patient_id_fkey",
  DROP CONSTRAINT "package_balances_package_id_fkey",
  ADD CONSTRAINT "package_balances_patient_same_clinic_fkey"
    FOREIGN KEY ("patient_id", "clinic_id") REFERENCES "patients"("id", "clinic_id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "package_balances_package_same_clinic_fkey"
    FOREIGN KEY ("package_id", "clinic_id") REFERENCES "packages"("id", "clinic_id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "payments"
  DROP CONSTRAINT "payments_patient_id_fkey",
  ADD CONSTRAINT "payments_patient_same_clinic_fkey"
    FOREIGN KEY ("patient_id", "clinic_id") REFERENCES "patients"("id", "clinic_id")
    ON DELETE CASCADE ON UPDATE CASCADE;
