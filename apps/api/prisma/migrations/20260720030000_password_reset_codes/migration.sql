CREATE TABLE "password_reset_codes" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "code_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "used_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "password_reset_codes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "password_reset_codes_user_id_created_at_idx" ON "password_reset_codes"("user_id", "created_at");
CREATE INDEX "password_reset_codes_expires_at_idx" ON "password_reset_codes"("expires_at");

ALTER TABLE "password_reset_codes" ADD CONSTRAINT "password_reset_codes_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
