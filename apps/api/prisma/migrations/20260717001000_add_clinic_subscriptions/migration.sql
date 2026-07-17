-- Control comercial de demo y suscripcion por clinica.

CREATE TABLE "clinic_subscriptions" (
    "id" UUID NOT NULL,
    "clinic_id" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending_verification',
    "verified_at" TIMESTAMPTZ,
    "trial_started_at" TIMESTAMPTZ,
    "trial_ends_at" TIMESTAMPTZ,
    "subscription_ends_at" TIMESTAMPTZ,
    "allowed_modules" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "clinic_subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "clinic_subscriptions_clinic_id_key" ON "clinic_subscriptions"("clinic_id");
CREATE INDEX "clinic_subscriptions_clinic_id_idx" ON "clinic_subscriptions"("clinic_id");
CREATE INDEX "clinic_subscriptions_status_idx" ON "clinic_subscriptions"("status");
CREATE INDEX "clinic_subscriptions_trial_ends_at_idx" ON "clinic_subscriptions"("trial_ends_at");
CREATE INDEX "clinic_subscriptions_subscription_ends_at_idx" ON "clinic_subscriptions"("subscription_ends_at");

ALTER TABLE "clinic_subscriptions"
ADD CONSTRAINT "clinic_subscriptions_clinic_id_fkey"
FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "platform_subscription_payments" (
    "id" UUID NOT NULL,
    "clinic_id" UUID NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "months" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'pendiente',
    "payphone_link" TEXT,
    "client_transaction_id" TEXT,
    "payphone_store_id" TEXT,
    "payphone_transaction_id" TEXT,
    "provider_payload" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paid_at" TIMESTAMPTZ,
    "note" TEXT,
    CONSTRAINT "platform_subscription_payments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "platform_subscription_payments_client_transaction_id_key" ON "platform_subscription_payments"("client_transaction_id");
CREATE INDEX "platform_subscription_payments_clinic_id_idx" ON "platform_subscription_payments"("clinic_id");
CREATE INDEX "platform_subscription_payments_status_created_at_idx" ON "platform_subscription_payments"("status", "created_at");
CREATE INDEX "platform_subscription_payments_payphone_store_id_idx" ON "platform_subscription_payments"("payphone_store_id");

ALTER TABLE "platform_subscription_payments"
ADD CONSTRAINT "platform_subscription_payments_clinic_id_fkey"
FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
