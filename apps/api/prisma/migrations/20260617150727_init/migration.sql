-- CreateEnum
CREATE TYPE "Role" AS ENUM ('admin', 'recepcion', 'profesional', 'esteticista', 'contador');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('agendada', 'confirmada', 'en_sala', 'atendida', 'no_show', 'cancelada');

-- CreateEnum
CREATE TYPE "AppointmentKind" AS ENUM ('consulta_nueva', 'control', 'procedimiento');

-- CreateEnum
CREATE TYPE "ClinicalRecordType" AS ENUM ('evolucion', 'receta');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('borrador', 'generada', 'firmada', 'autorizada', 'rechazada');

-- CreateEnum
CREATE TYPE "ConsentStatus" AS ENUM ('pendiente', 'firmado', 'revocado');

-- CreateEnum
CREATE TYPE "ConsentKind" AS ENUM ('clinico', 'imagen');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('pendiente', 'pagado', 'anulado');

-- CreateEnum
CREATE TYPE "PaymentConcept" AS ENUM ('libre', 'deposito', 'paquete', 'factura');

-- CreateEnum
CREATE TYPE "PhotoKind" AS ENUM ('basal', 'control');

-- CreateEnum
CREATE TYPE "PackageBalanceStatus" AS ENUM ('activo', 'completado', 'vencido', 'anulado');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "full_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "mfa_enabled" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "professional_id" UUID,
    "last_access" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "professionals" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "specialty" TEXT NOT NULL DEFAULT 'Dermatología',
    "registration_no" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#7A4A2B',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "professionals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patients" (
    "id" UUID NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "id_type" TEXT NOT NULL DEFAULT 'cedula',
    "id_number" TEXT NOT NULL,
    "birth_date" DATE NOT NULL,
    "sex" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "city" TEXT,
    "next_appointment" TIMESTAMPTZ,
    "background" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "services" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "duration_min" INTEGER NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "vat_rate" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "professional_id" UUID NOT NULL,
    "start_at" TIMESTAMPTZ NOT NULL,
    "end_at" TIMESTAMPTZ NOT NULL,
    "kind" "AppointmentKind" NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'agendada',
    "notes" TEXT,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinical_records" (
    "id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "professional_id" UUID NOT NULL,
    "type" "ClinicalRecordType" NOT NULL,
    "date" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "subjective" TEXT,
    "objective" TEXT,
    "assessment" TEXT,
    "plan" TEXT,
    "cie10_codes" TEXT[],
    "prescription" JSONB,

    CONSTRAINT "clinical_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "photos" (
    "id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "taken_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "body_area" TEXT NOT NULL,
    "lesion_tag" TEXT NOT NULL,
    "caption" TEXT NOT NULL,
    "kind" "PhotoKind" NOT NULL DEFAULT 'basal',
    "storage_path" TEXT NOT NULL,
    "created_by" UUID,

    CONSTRAINT "photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consent_templates" (
    "id" UUID NOT NULL,
    "kind" "ConsentKind" NOT NULL DEFAULT 'clinico',
    "title" TEXT NOT NULL,
    "procedure_type" TEXT NOT NULL,
    "body" TEXT NOT NULL,

    CONSTRAINT "consent_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consents" (
    "id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "template_id" UUID NOT NULL,
    "status" "ConsentStatus" NOT NULL DEFAULT 'pendiente',
    "signed_at" TIMESTAMPTZ,
    "signature_path" TEXT,
    "procedure_id" UUID,

    CONSTRAINT "consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "procedures" (
    "id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "professional_id" UUID NOT NULL,
    "date" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "product_used" TEXT,
    "units" INTEGER,
    "lot_number" TEXT,
    "expiry" DATE,
    "injection_areas" TEXT[],
    "consent_id" UUID,
    "photo_ids" UUID[] DEFAULT ARRAY[]::UUID[],
    "notes" TEXT,

    CONSTRAINT "procedures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "stock" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "min_stock" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "lot_number" TEXT,
    "expiry_date" DATE,

    CONSTRAINT "inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" UUID NOT NULL,
    "number" TEXT NOT NULL,
    "patient_id" UUID,
    "customer_name" TEXT,
    "date" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lines" JSONB NOT NULL,
    "subtotal_0" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "subtotal_15" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "vat_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "access_key" TEXT NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'borrador',

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "packages" (
    "id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "sessions" INTEGER NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "interval_days" INTEGER NOT NULL DEFAULT 30,
    "validity_days" INTEGER NOT NULL DEFAULT 365,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "package_balances" (
    "id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "package_id" UUID NOT NULL,
    "sold_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "seller_professional_id" UUID,
    "sessions_total" INTEGER NOT NULL,
    "sessions_used" INTEGER NOT NULL DEFAULT 0,
    "price" DECIMAL(10,2) NOT NULL,
    "vencimiento" TIMESTAMPTZ NOT NULL,
    "status" "PackageBalanceStatus" NOT NULL DEFAULT 'activo',

    CONSTRAINT "package_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "package_payments" (
    "id" UUID NOT NULL,
    "balance_id" UUID NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "method" TEXT NOT NULL,
    "at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,

    CONSTRAINT "package_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "package_redemptions" (
    "id" UUID NOT NULL,
    "balance_id" UUID NOT NULL,
    "at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "appointment_id" UUID,
    "professional_id" UUID,
    "note" TEXT,

    CONSTRAINT "package_redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "concept_type" "PaymentConcept" NOT NULL,
    "concept_ref_id" UUID,
    "concept_label" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'payphone',
    "status" "PaymentStatus" NOT NULL DEFAULT 'pendiente',
    "payphone_link" TEXT,
    "tx_id" TEXT,
    "sent_via" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paid_at" TIMESTAMPTZ,
    "note" TEXT,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "action" TEXT NOT NULL,
    "cat" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT '',
    "at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" TEXT,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "patients_last_name_first_name_idx" ON "patients"("last_name", "first_name");

-- CreateIndex
CREATE UNIQUE INDEX "patients_id_type_id_number_key" ON "patients"("id_type", "id_number");

-- CreateIndex
CREATE INDEX "appointments_start_at_idx" ON "appointments"("start_at");

-- CreateIndex
CREATE INDEX "appointments_patient_id_idx" ON "appointments"("patient_id");

-- CreateIndex
CREATE INDEX "appointments_professional_id_start_at_idx" ON "appointments"("professional_id", "start_at");

-- CreateIndex
CREATE INDEX "clinical_records_patient_id_date_idx" ON "clinical_records"("patient_id", "date");

-- CreateIndex
CREATE INDEX "photos_patient_id_taken_at_idx" ON "photos"("patient_id", "taken_at");

-- CreateIndex
CREATE INDEX "photos_lesion_tag_idx" ON "photos"("lesion_tag");

-- CreateIndex
CREATE INDEX "consents_patient_id_idx" ON "consents"("patient_id");

-- CreateIndex
CREATE INDEX "procedures_patient_id_date_idx" ON "procedures"("patient_id", "date");

-- CreateIndex
CREATE INDEX "inventory_expiry_date_idx" ON "inventory"("expiry_date");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_number_key" ON "invoices"("number");

-- CreateIndex
CREATE INDEX "invoices_date_idx" ON "invoices"("date");

-- CreateIndex
CREATE INDEX "invoices_patient_id_idx" ON "invoices"("patient_id");

-- CreateIndex
CREATE INDEX "package_balances_patient_id_sold_at_idx" ON "package_balances"("patient_id", "sold_at");

-- CreateIndex
CREATE INDEX "package_payments_balance_id_idx" ON "package_payments"("balance_id");

-- CreateIndex
CREATE INDEX "package_redemptions_balance_id_idx" ON "package_redemptions"("balance_id");

-- CreateIndex
CREATE INDEX "payments_patient_id_idx" ON "payments"("patient_id");

-- CreateIndex
CREATE INDEX "payments_status_created_at_idx" ON "payments"("status", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_at_idx" ON "audit_logs"("at");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_cat_idx" ON "audit_logs"("cat");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "professionals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "professionals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_records" ADD CONSTRAINT "clinical_records_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_records" ADD CONSTRAINT "clinical_records_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "professionals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photos" ADD CONSTRAINT "photos_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photos" ADD CONSTRAINT "photos_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consents" ADD CONSTRAINT "consents_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consents" ADD CONSTRAINT "consents_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "consent_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procedures" ADD CONSTRAINT "procedures_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procedures" ADD CONSTRAINT "procedures_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procedures" ADD CONSTRAINT "procedures_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "professionals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packages" ADD CONSTRAINT "packages_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_balances" ADD CONSTRAINT "package_balances_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_balances" ADD CONSTRAINT "package_balances_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_balances" ADD CONSTRAINT "package_balances_seller_professional_id_fkey" FOREIGN KEY ("seller_professional_id") REFERENCES "professionals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_payments" ADD CONSTRAINT "package_payments_balance_id_fkey" FOREIGN KEY ("balance_id") REFERENCES "package_balances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_redemptions" ADD CONSTRAINT "package_redemptions_balance_id_fkey" FOREIGN KEY ("balance_id") REFERENCES "package_balances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_redemptions" ADD CONSTRAINT "package_redemptions_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_redemptions" ADD CONSTRAINT "package_redemptions_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "professionals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
