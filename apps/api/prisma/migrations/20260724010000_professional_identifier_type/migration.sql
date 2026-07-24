ALTER TABLE "professionals"
ADD COLUMN "identifier_type" TEXT NOT NULL DEFAULT 'otro';

UPDATE "professionals"
SET "identifier_type" = 'acess_msp'
WHERE NULLIF(BTRIM("registration_no"), '') IS NOT NULL;
