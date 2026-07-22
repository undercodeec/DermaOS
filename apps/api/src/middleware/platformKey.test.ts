import assert from "node:assert/strict";
import test from "node:test";
import { signPlatformMfaChallenge, verifyPlatformMfaChallenge } from "./platformKey.js";

test("challenge MFA de plataforma acepta un codigo una sola vez", () => {
  const challenge = signPlatformMfaChallenge("gerencia@undercodeec.com", "123456");
  assert.equal(verifyPlatformMfaChallenge(challenge, "000000"), null);
  assert.equal(verifyPlatformMfaChallenge(challenge, "123456"), "gerencia@undercodeec.com");
  assert.equal(verifyPlatformMfaChallenge(challenge, "123456"), null);
});
