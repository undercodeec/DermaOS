import assert from "node:assert/strict";
import test from "node:test";
import {
  clinicalFileDateRange,
  clinicalFileQuerySchema,
  clinicalFileRequiredModules,
} from "./clinical-file.js";

test("clinical file defaults include clinical sections but exclude photos", () => {
  const query = clinicalFileQuerySchema.parse({});
  assert.equal(query.includeEvolutions, true);
  assert.equal(query.includePrescriptions, true);
  assert.equal(query.includeProcedures, true);
  assert.equal(query.includeConsents, true);
  assert.equal(query.includePhotos, false);
  assert.deepEqual(clinicalFileRequiredModules(query), ["historia", "procedimientos", "consentimientos"]);
});

test("clinical file date range uses Ecuador day boundaries and an exclusive end", () => {
  const query = clinicalFileQuerySchema.parse({ from: "2026-07-01", to: "2026-07-22" });
  const range = clinicalFileDateRange(query);
  assert.equal(range.gte?.toISOString(), "2026-07-01T05:00:00.000Z");
  assert.equal(range.lt?.toISOString(), "2026-07-23T05:00:00.000Z");
});

test("clinical file rejects inverted ranges", () => {
  assert.throws(() => clinicalFileQuerySchema.parse({ from: "2026-07-22", to: "2026-07-01" }));
});

test("clinical file rejects calendar dates that do not exist", () => {
  assert.throws(() => clinicalFileQuerySchema.parse({ from: "2026-02-30" }));
});

test("clinical file only requires modules for selected sections", () => {
  const query = clinicalFileQuerySchema.parse({
    includeEvolutions: "0",
    includePrescriptions: "0",
    includeProcedures: "0",
    includeConsents: "0",
    includePhotos: "1",
  });
  assert.deepEqual(clinicalFileRequiredModules(query), ["fotos"]);
});
