-- Payphone real por clinica: credenciales manuales aisladas por tenant.

CREATE TABLE "clinic_payment_providers" (
    "id" UUID NOT NULL,
    "clinic_id" UUID NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'payphone',
    "mode" TEXT NOT NULL DEFAULT 'manual',
    "ruc" TEXT,
    "store_id" TEXT NOT NULL,
    "token_encrypted" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "last_verified_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "clinic_payment_providers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "clinic_payment_providers_clinic_id_key" ON "clinic_payment_providers"("clinic_id");
CREATE INDEX "clinic_payment_providers_clinic_id_idx" ON "clinic_payment_providers"("clinic_id");
CREATE INDEX "clinic_payment_providers_provider_status_idx" ON "clinic_payment_providers"("provider", "status");

ALTER TABLE "clinic_payment_providers"
ADD CONSTRAINT "clinic_payment_providers_clinic_id_fkey"
FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "payments" ADD COLUMN "client_transaction_id" TEXT;
ALTER TABLE "payments" ADD COLUMN "payphone_store_id" TEXT;
ALTER TABLE "payments" ADD COLUMN "payphone_transaction_id" TEXT;
ALTER TABLE "payments" ADD COLUMN "provider_status" TEXT;
ALTER TABLE "payments" ADD COLUMN "provider_payload" JSONB;

CREATE UNIQUE INDEX "payments_client_transaction_id_key" ON "payments"("client_transaction_id");
CREATE INDEX "payments_payphone_store_id_idx" ON "payments"("payphone_store_id");
