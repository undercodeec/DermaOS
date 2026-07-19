import assert from "node:assert/strict";
import test from "node:test";
import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../lib/errors.js";
import { ipAndEmailKey, rateLimit } from "./rateLimit.js";

function run(handler: ReturnType<typeof rateLimit>, email: string) {
  let received: unknown;
  const req = { ip: "127.0.0.1", body: { email } } as Request;
  const res = { setHeader() {} } as unknown as Response;
  handler(req, res, ((error?: unknown) => { received = error; }) as NextFunction);
  return received;
}

test("limite rechaza solicitudes posteriores al maximo", () => {
  const limiter = rateLimit({ windowMs: 60_000, max: 2, key: ipAndEmailKey });
  assert.equal(run(limiter, "user@example.com"), undefined);
  assert.equal(run(limiter, "user@example.com"), undefined);
  const error = run(limiter, "user@example.com");
  assert.ok(error instanceof HttpError);
  assert.equal(error.statusCode, 429);
});

test("limite separa identidades bajo una misma IP", () => {
  const limiter = rateLimit({ windowMs: 60_000, max: 1, key: ipAndEmailKey });
  assert.equal(run(limiter, "one@example.com"), undefined);
  assert.equal(run(limiter, "two@example.com"), undefined);
});
