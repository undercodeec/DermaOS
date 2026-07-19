import path from "node:path";
import fs from "node:fs/promises";
import { env } from "../env.js";

const LOCAL_PREFIX = "local:";
const SUPABASE_PREFIX = "supabase:";
const PHOTO_DIR = path.resolve(env.UPLOAD_DIR, "patient-photos");

export async function storePhoto(input: {
  clinicId: string;
  patientId: string;
  filename: string;
  buffer: Buffer;
  contentType: string;
}) {
  if (env.PHOTO_STORAGE_PROVIDER === "local") {
    await fs.mkdir(PHOTO_DIR, { recursive: true });
    await fs.writeFile(path.join(PHOTO_DIR, input.filename), input.buffer);
    return `${LOCAL_PREFIX}${input.filename}`;
  }

  const objectKey = `${input.clinicId}/${input.patientId}/${input.filename}`;
  const response = await uploadObject(objectKey, {
    method: "POST",
    headers: {
      "content-type": input.contentType,
      "x-upsert": "false",
    },
    body: input.buffer,
  });
  if (!response.ok) throw new Error("No se pudo guardar la fotografia en Supabase Storage");
  return `${SUPABASE_PREFIX}${objectKey}`;
}

export async function readPhoto(storagePath: string) {
  if (!storagePath.startsWith(SUPABASE_PREFIX)) {
    const filename = storagePath.startsWith(LOCAL_PREFIX) ? storagePath.slice(LOCAL_PREFIX.length) : storagePath;
    const fullPath = path.join(PHOTO_DIR, filename);
    if (!isInside(fullPath, PHOTO_DIR)) throw new Error("Ruta de fotografia invalida");
    return fs.readFile(fullPath);
  }

  const response = await downloadObject(storagePath.slice(SUPABASE_PREFIX.length));
  if (!response.ok) throw new Error("No se pudo recuperar la fotografia de Supabase Storage");
  return Buffer.from(await response.arrayBuffer());
}

export async function removePhoto(storagePath: string) {
  if (!storagePath.startsWith(SUPABASE_PREFIX)) {
    const filename = storagePath.startsWith(LOCAL_PREFIX) ? storagePath.slice(LOCAL_PREFIX.length) : storagePath;
    const fullPath = path.join(PHOTO_DIR, filename);
    if (!isInside(fullPath, PHOTO_DIR)) return;
    await fs.unlink(fullPath).catch(() => {});
    return;
  }

  const response = await storageBucketRequest({
    method: "DELETE",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ prefixes: [storagePath.slice(SUPABASE_PREFIX.length)] }),
  });
  if (!response.ok) throw new Error("No se pudo eliminar la fotografia de Supabase Storage");
}

function uploadObject(objectPath: string, init: RequestInit = {}) {
  const encodedPath = objectPath.split("/").map(encodeURIComponent).join("/");
  return storageFetch(`/object/${encodeURIComponent(env.SUPABASE_PHOTO_BUCKET)}/${encodedPath}`, init);
}

function downloadObject(objectPath: string, init: RequestInit = {}) {
  const encodedPath = objectPath.split("/").map(encodeURIComponent).join("/");
  return storageFetch(`/object/authenticated/${encodeURIComponent(env.SUPABASE_PHOTO_BUCKET)}/${encodedPath}`, init);
}

function storageBucketRequest(init: RequestInit = {}) {
  return storageFetch(`/object/${encodeURIComponent(env.SUPABASE_PHOTO_BUCKET)}`, init);
}

function storageFetch(suffix: string, init: RequestInit) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Falta configurar Supabase Storage en el entorno de la API");
  }
  return fetch(`${env.SUPABASE_URL}/storage/v1${suffix}`, {
    ...init,
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      ...init.headers,
    },
  });
}

function isInside(child: string, parent: string) {
  const relative = path.relative(parent, child);
  return !relative.startsWith("..") && !path.isAbsolute(relative);
}
