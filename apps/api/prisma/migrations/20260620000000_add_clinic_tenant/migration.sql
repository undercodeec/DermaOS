-- ============================================================
-- Multi-tenant: tabla clinics + clinic_id en todas las raíces
-- UUID fijo de clínica demo: 00000000-0000-4000-9000-000000000001
-- ============================================================

-- 1. Tabla raíz de tenants
CREATE TABLE "clinics" (
    "id"         UUID        NOT NULL,
    "name"       TEXT        NOT NULL,
    "ruc"        TEXT,
    "public_key" TEXT,
    "active"     BOOLEAN     NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "clinics_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "clinics_public_key_key" ON "clinics"("public_key");

-- 2. Clínica por defecto para backfill de filas existentes
INSERT INTO "clinics" ("id", "name")
VALUES ('00000000-0000-4000-9000-000000000001', 'Derma Piel y Pelo');

-- 3. Agregar clinic_id con DEFAULT en todas las tablas raíz
--    El DEFAULT permite el backfill automático de filas pre-existentes.
ALTER TABLE "users"             ADD COLUMN "clinic_id" UUID NOT NULL DEFAULT '00000000-0000-4000-9000-000000000001';
ALTER TABLE "patients"          ADD COLUMN "clinic_id" UUID NOT NULL DEFAULT '00000000-0000-4000-9000-000000000001';
ALTER TABLE "professionals"     ADD COLUMN "clinic_id" UUID NOT NULL DEFAULT '00000000-0000-4000-9000-000000000001';
ALTER TABLE "services"          ADD COLUMN "clinic_id" UUID NOT NULL DEFAULT '00000000-0000-4000-9000-000000000001';
ALTER TABLE "packages"          ADD COLUMN "clinic_id" UUID NOT NULL DEFAULT '00000000-0000-4000-9000-000000000001';
ALTER TABLE "package_balances"  ADD COLUMN "clinic_id" UUID NOT NULL DEFAULT '00000000-0000-4000-9000-000000000001';
ALTER TABLE "inventory"         ADD COLUMN "clinic_id" UUID NOT NULL DEFAULT '00000000-0000-4000-9000-000000000001';
ALTER TABLE "invoices"          ADD COLUMN "clinic_id" UUID NOT NULL DEFAULT '00000000-0000-4000-9000-000000000001';
ALTER TABLE "audit_logs"        ADD COLUMN "clinic_id" UUID NOT NULL DEFAULT '00000000-0000-4000-9000-000000000001';
ALTER TABLE "consent_templates" ADD COLUMN "clinic_id" UUID NOT NULL DEFAULT '00000000-0000-4000-9000-000000000001';
ALTER TABLE "appointments"      ADD COLUMN "clinic_id" UUID NOT NULL DEFAULT '00000000-0000-4000-9000-000000000001';
ALTER TABLE "payments"          ADD COLUMN "clinic_id" UUID NOT NULL DEFAULT '00000000-0000-4000-9000-000000000001';

-- 4. FK constraints
ALTER TABLE "users"             ADD CONSTRAINT "users_clinic_id_fkey"             FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "patients"          ADD CONSTRAINT "patients_clinic_id_fkey"          FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "professionals"     ADD CONSTRAINT "professionals_clinic_id_fkey"     FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "services"          ADD CONSTRAINT "services_clinic_id_fkey"          FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "packages"          ADD CONSTRAINT "packages_clinic_id_fkey"          FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "package_balances"  ADD CONSTRAINT "package_balances_clinic_id_fkey"  FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory"         ADD CONSTRAINT "inventory_clinic_id_fkey"         FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "invoices"          ADD CONSTRAINT "invoices_clinic_id_fkey"          FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "audit_logs"        ADD CONSTRAINT "audit_logs_clinic_id_fkey"        FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "consent_templates" ADD CONSTRAINT "consent_templates_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "appointments"      ADD CONSTRAINT "appointments_clinic_id_fkey"      FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payments"          ADD CONSTRAINT "payments_clinic_id_fkey"          FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 5. Índices por clinic_id
CREATE INDEX "users_clinic_id_idx"             ON "users"("clinic_id");
CREATE INDEX "patients_clinic_id_idx"          ON "patients"("clinic_id");
CREATE INDEX "professionals_clinic_id_idx"     ON "professionals"("clinic_id");
CREATE INDEX "services_clinic_id_idx"          ON "services"("clinic_id");
CREATE INDEX "packages_clinic_id_idx"          ON "packages"("clinic_id");
CREATE INDEX "package_balances_clinic_id_idx"  ON "package_balances"("clinic_id");
CREATE INDEX "inventory_clinic_id_idx"         ON "inventory"("clinic_id");
CREATE INDEX "invoices_clinic_id_idx"          ON "invoices"("clinic_id");
CREATE INDEX "audit_logs_clinic_id_idx"        ON "audit_logs"("clinic_id");
CREATE INDEX "consent_templates_clinic_id_idx" ON "consent_templates"("clinic_id");
CREATE INDEX "appointments_clinic_id_idx"      ON "appointments"("clinic_id");
CREATE INDEX "payments_clinic_id_idx"          ON "payments"("clinic_id");

-- 6. Migrar unique index de patients: global → por clínica
DROP INDEX "patients_id_type_id_number_key";
CREATE UNIQUE INDEX "patients_clinic_id_id_type_id_number_key" ON "patients"("clinic_id", "id_type", "id_number");

-- 7. Eliminar los DEFAULT (nuevas filas deben proveer clinic_id explícitamente)
ALTER TABLE "users"             ALTER COLUMN "clinic_id" DROP DEFAULT;
ALTER TABLE "patients"          ALTER COLUMN "clinic_id" DROP DEFAULT;
ALTER TABLE "professionals"     ALTER COLUMN "clinic_id" DROP DEFAULT;
ALTER TABLE "services"          ALTER COLUMN "clinic_id" DROP DEFAULT;
ALTER TABLE "packages"          ALTER COLUMN "clinic_id" DROP DEFAULT;
ALTER TABLE "package_balances"  ALTER COLUMN "clinic_id" DROP DEFAULT;
ALTER TABLE "inventory"         ALTER COLUMN "clinic_id" DROP DEFAULT;
ALTER TABLE "invoices"          ALTER COLUMN "clinic_id" DROP DEFAULT;
ALTER TABLE "audit_logs"        ALTER COLUMN "clinic_id" DROP DEFAULT;
ALTER TABLE "consent_templates" ALTER COLUMN "clinic_id" DROP DEFAULT;
ALTER TABLE "appointments"      ALTER COLUMN "clinic_id" DROP DEFAULT;
ALTER TABLE "payments"          ALTER COLUMN "clinic_id" DROP DEFAULT;
