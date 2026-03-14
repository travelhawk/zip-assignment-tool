import test from "node:test";
import assert from "node:assert/strict";
import {
  buildElectronBrowserLoginUrl,
  buildElectronProtocolUrl,
  consumeElectronHandoff,
  createElectronHandoff,
  createElectronSessionToken,
  readElectronSessionToken,
} from "./electron-auth.ts";

test("electron session tokens round-trip valid user data", () => {
  const secret = "test-secret";
  const token = createElectronSessionToken(
    {
      email: "test@example.com",
      isAdmin: true,
      name: "Test User",
    },
    secret,
  );

  assert.deepEqual(readElectronSessionToken(token, secret), {
    authMethod: "entra",
    email: "test@example.com",
    isAdmin: true,
    name: "Test User",
  });
});

test("electron session tokens reject tampering", () => {
  const secret = "test-secret";
  const token = createElectronSessionToken(
    {
      email: "test@example.com",
      isAdmin: false,
      name: "Test User",
    },
    secret,
  );

  assert.equal(readElectronSessionToken(`${token}tampered`, secret), null);
});

test("electron handoff tokens can only be consumed once", () => {
  const handoff = createElectronHandoff({
    email: "test@example.com",
    isAdmin: false,
    name: "Test User",
  });

  assert.deepEqual(consumeElectronHandoff(handoff), {
    authMethod: "entra",
    email: "test@example.com",
    isAdmin: false,
    name: "Test User",
  });
  assert.equal(consumeElectronHandoff(handoff), null);
});

test("electron browser login url points back to the desktop completion page", () => {
  assert.equal(
    buildElectronBrowserLoginUrl("https://plz.example.com"),
    "https://plz.example.com/api/auth/signin/microsoft-entra-id?callbackUrl=https%3A%2F%2Fplz.example.com%2Felectron-auth%2Fcomplete",
  );
});

test("electron protocol url carries the handoff token", () => {
  assert.equal(
    buildElectronProtocolUrl("abc123"),
    "plz-zuordnung://auth/callback?handoff=abc123",
  );
});
