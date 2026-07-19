import assert from "node:assert/strict";
import test from "node:test";
import { roleCanConsume, roleCanReconcile, roleCanWrite } from "./permissions.js";

test("esteticista no obtiene escritura completa de historia por permiso Limitado", () => {
  assert.equal(roleCanWrite("esteticista", "historia"), false);
});

test("contador puede conciliar pagos pero no crear cobros", () => {
  assert.equal(roleCanReconcile("contador", "pagos"), true);
  assert.equal(roleCanWrite("contador", "pagos"), false);
});

test("consumo de inventario queda limitado a roles operativos previstos", () => {
  assert.equal(roleCanConsume("admin", "inventario"), true);
  assert.equal(roleCanConsume("profesional", "inventario"), true);
  assert.equal(roleCanConsume("esteticista", "inventario"), true);
  assert.equal(roleCanConsume("recepcion", "inventario"), false);
  assert.equal(roleCanConsume("contador", "inventario"), false);
});
