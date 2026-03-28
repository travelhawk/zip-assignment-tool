import test from "node:test";
import assert from "node:assert/strict";
import {
  buildElectronBrowserLoginUrl,
  buildElectronPollUrl,
  buildElectronProtocolUrl,
  createElectronSessionToken,
  readElectronSessionToken,
} from "./electron-auth.ts";

test("electron session tokens round-trip valid user data", () => {
  const secret = "test-secret";
  const token = createElectronSessionToken(
    {
      email: "test@example.com",
      isAdmin: true,
      isSuperAdmin: true,
      name: "Test User",
    },
    secret,
  );

  assert.deepEqual(readElectronSessionToken(token, secret), {
    authMethod: "entra",
    email: "test@example.com",
    isAdmin: true,
    isSuperAdmin: true,
    name: "Test User",
  });
});

test("electron session tokens reject tampering", () => {
  const secret = "test-secret";
  const token = createElectronSessionToken(
    {
      email: "test@example.com",
      isAdmin: false,
      isSuperAdmin: false,
      name: "Test User",
    },
    secret,
  );

  assert.equal(readElectronSessionToken(`${token}tampered`, secret), null);
});

test("electron browser login url includes the request id", () => {
  assert.equal(
    buildElectronBrowserLoginUrl("https://plz.example.com", "req123"),
    "https://plz.example.com/electron-auth/start?request=req123",
  );
});

test("electron poll url includes the request id", () => {
  assert.equal(
    buildElectronPollUrl("https://plz.example.com", "req123"),
    "https://plz.example.com/electron-auth/poll?request=req123",
  );
});

test("electron protocol url carries the request id", () => {
  assert.equal(
    buildElectronProtocolUrl("req123"),
    "plz-zuordnung://auth/callback?request=req123",
  );
});
