import assert from "node:assert/strict";
import test from "node:test";
import crypto from "node:crypto";
import { env } from "../env.js";
import { readPhoto, removePhoto, storePhoto } from "./photo-storage.js";

test("almacenamiento local conserva y elimina una foto", {
  skip: env.PHOTO_STORAGE_PROVIDER !== "local",
}, async () => {
  const buffer = Buffer.from("imagen-de-prueba");
  const filename = `test-${crypto.randomUUID()}.jpg`;
  const storagePath = await storePhoto({
    clinicId: crypto.randomUUID(),
    patientId: crypto.randomUUID(),
    filename,
    buffer,
    contentType: "image/jpeg",
  });

  assert.equal(storagePath, `local:${filename}`);
  assert.deepEqual(await readPhoto(storagePath), buffer);
  await removePhoto(storagePath);
  await assert.rejects(readPhoto(storagePath));
});
