import assert from "node:assert/strict";
import test from "node:test";
import { addMonths } from "./entitlements.js";

test("addMonths conserva fin de mes sin desbordarse a marzo", () => {
  assert.equal(
    addMonths(new Date("2026-01-31T15:30:00.000Z"), 1).toISOString(),
    "2026-02-28T15:30:00.000Z",
  );
});

test("addMonths respeta febrero bisiesto y meses acumulados", () => {
  assert.equal(
    addMonths(new Date("2024-01-31T15:30:00.000Z"), 1).toISOString(),
    "2024-02-29T15:30:00.000Z",
  );
  assert.equal(
    addMonths(new Date("2026-01-31T15:30:00.000Z"), 2).toISOString(),
    "2026-03-31T15:30:00.000Z",
  );
});
