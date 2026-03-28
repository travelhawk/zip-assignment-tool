import { createHmac, timingSafeEqual } from "node:crypto";

export const ELECTRON_PROTOCOL = "plz-zuordnung";
export const ELECTRON_SESSION_COOKIE = "plz_electron_session";

const ELECTRON_SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
type ElectronSessionPayload = {
  authMethod: "entra";
  email: string | null;
  exp: number;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  name: string | null;
  type: "electron-session";
};

export type ElectronSessionUser = {
  authMethod: "entra";
  email: string | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  name: string | null;
};

function encodeBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decodeBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signValue(value: string, secret: string) {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function buildSignedToken(payload: ElectronSessionPayload, secret: string) {
  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  const signature = signValue(encodedPayload, secret);
  return `${encodedPayload}.${signature}`;
}

export function createElectronSessionToken(
  user: Omit<ElectronSessionUser, "authMethod">,
  secret: string,
  now = Date.now(),
) {
  const payload: ElectronSessionPayload = {
    type: "electron-session",
    authMethod: "entra",
    email: user.email,
    name: user.name,
    isAdmin: user.isAdmin,
    isSuperAdmin: user.isSuperAdmin,
    exp: now + ELECTRON_SESSION_TTL_SECONDS * 1000,
  };

  return buildSignedToken(payload, secret);
}

export function readElectronSessionToken(token: string | null | undefined, secret: string) {
  if (!token || !secret) {
    return null;
  }

  const segments = token.split(".");

  if (segments.length !== 2) {
    return null;
  }

  const [encodedPayload, signature] = segments;
  const expectedSignature = signValue(encodedPayload, secret);

  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(decodeBase64Url(encodedPayload)) as ElectronSessionPayload;

    if (
      payload.type !== "electron-session" ||
      payload.authMethod !== "entra" ||
      typeof payload.isAdmin !== "boolean" ||
      typeof payload.isSuperAdmin !== "boolean" ||
      typeof payload.exp !== "number" ||
      payload.exp <= Date.now()
    ) {
      return null;
    }

    return {
      authMethod: "entra",
      email: typeof payload.email === "string" ? payload.email : null,
      isAdmin: payload.isAdmin,
      isSuperAdmin: payload.isSuperAdmin,
      name: typeof payload.name === "string" ? payload.name : null,
    } satisfies ElectronSessionUser;
  } catch {
    return null;
  }
}

export function getElectronSessionCookieOptions(secure: boolean) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure,
    path: "/",
    maxAge: ELECTRON_SESSION_TTL_SECONDS,
  };
}

export function buildElectronBrowserLoginUrl(baseUrl: string, requestId: string) {
  const startUrl = new URL("/electron-auth/start", baseUrl);
  startUrl.searchParams.set("request", requestId);
  return startUrl.toString();
}

export function buildElectronExchangeUrl(baseUrl: string, requestId: string) {
  const exchangeUrl = new URL("/electron-auth/exchange", baseUrl);
  exchangeUrl.searchParams.set("request", requestId);
  return exchangeUrl.toString();
}

export function buildElectronPollUrl(baseUrl: string, requestId: string) {
  const pollUrl = new URL("/electron-auth/poll", baseUrl);
  pollUrl.searchParams.set("request", requestId);
  return pollUrl.toString();
}

export function buildElectronRequestUrl(baseUrl: string) {
  return new URL("/electron-auth/request", baseUrl).toString();
}

export function buildElectronProtocolUrl(requestId: string) {
  const protocolUrl = new URL(`${ELECTRON_PROTOCOL}://auth/callback`);
  protocolUrl.searchParams.set("request", requestId);
  return protocolUrl.toString();
}
