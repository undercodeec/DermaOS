import crypto from "node:crypto";
import { env } from "../env.js";

const ALG = "aes-256-gcm";

function key() {
  return crypto.createHash("sha256").update(env.PAYPHONE_CREDENTIAL_KEY || env.JWT_SECRET).digest();
}

export function encryptSecret(value: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALG, key(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64url"), tag.toString("base64url"), encrypted.toString("base64url")].join(":");
}

export function decryptSecret(value: string) {
  const [version, ivRaw, tagRaw, dataRaw] = value.split(":");
  if (version !== "v1" || !ivRaw || !tagRaw || !dataRaw) {
    throw new Error("Formato de secreto invalido");
  }
  const decipher = crypto.createDecipheriv(ALG, key(), Buffer.from(ivRaw, "base64url"));
  decipher.setAuthTag(Buffer.from(tagRaw, "base64url"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataRaw, "base64url")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

