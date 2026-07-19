-- Relaciona cada conciliacion Payphone con un solo abono de paquete.
ALTER TABLE "package_payments"
ADD COLUMN "payment_id" UUID;

CREATE UNIQUE INDEX "package_payments_payment_id_key"
ON "package_payments"("payment_id");

ALTER TABLE "package_payments"
ADD CONSTRAINT "package_payments_payment_id_fkey"
FOREIGN KEY ("payment_id") REFERENCES "payments"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- Una cita solo puede consumir una sesion. PostgreSQL permite multiples NULL.
CREATE UNIQUE INDEX "package_redemptions_appointment_id_key"
ON "package_redemptions"("appointment_id");

-- La numeracion de facturas pertenece a cada clinica y se incrementa atomicamente.
ALTER TABLE "clinics"
ADD COLUMN "invoice_sequence" INTEGER NOT NULL DEFAULT 242;

UPDATE "clinics" c
SET "invoice_sequence" = COALESCE((
  SELECT MAX(RIGHT(i."number", 9)::INTEGER)
  FROM "invoices" i
  WHERE i."clinic_id" = c."id" AND i."number" ~ '^[0-9]{3}-[0-9]{3}-[0-9]{9}$'
), 242);

DROP INDEX IF EXISTS "invoices_number_key";
CREATE UNIQUE INDEX "invoices_clinic_id_number_key"
ON "invoices"("clinic_id", "number");

-- Una transaccion confirmada del proveedor no puede acreditar dos veces en la misma tabla.
CREATE UNIQUE INDEX "payments_payphone_store_id_payphone_transaction_id_key"
ON "payments"("payphone_store_id", "payphone_transaction_id");

CREATE UNIQUE INDEX "platform_subscription_payments_payphone_store_id_payphone_transaction_id_key"
ON "platform_subscription_payments"("payphone_store_id", "payphone_transaction_id");
