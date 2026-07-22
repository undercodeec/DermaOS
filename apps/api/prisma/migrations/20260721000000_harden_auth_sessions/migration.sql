-- Los codigos enviados por correo no deben reutilizar el secreto reservado para MFA.
-- auth_version permite revocar inmediatamente los JWT emitidos antes de un cambio sensible.
ALTER TABLE "users"
  ADD COLUMN "email_code_hash" TEXT,
  ADD COLUMN "email_code_expires_at" TIMESTAMPTZ,
  ADD COLUMN "auth_version" INTEGER NOT NULL DEFAULT 0;
