export type BasicCredentials = {
  username: string;
  password: string;
};

function decodeBase64(value: string) {
  if (typeof atob === "function") {
    return atob(value);
  }

  return Buffer.from(value, "base64").toString("utf8");
}

export function parseBasicAuthorizationHeader(header: string | null) {
  if (!header || !header.startsWith("Basic ")) {
    return null;
  }

  try {
    const decoded = decodeBase64(header.slice("Basic ".length));
    const separatorIndex = decoded.indexOf(":");

    if (separatorIndex < 0) {
      return null;
    }

    return {
      username: decoded.slice(0, separatorIndex),
      password: decoded.slice(separatorIndex + 1),
    } satisfies BasicCredentials;
  } catch {
    return null;
  }
}

export function isValidBasicCredentials(credentials: BasicCredentials | null) {
  const method = (process.env.AUTH_METHOD ?? "entra").trim().toLowerCase();
  const username = process.env.BASIC_AUTH_USERNAME?.trim() || "tester";
  const password = process.env.BASIC_AUTH_PASSWORD?.trim() ?? "";

  if (!credentials || method !== "basic" || !password) {
    return false;
  }

  return credentials.username === username && credentials.password === password;
}

export function createBasicAuthChallengeHeaders() {
  const appName = "PLZ-Zuordnung";
  const companyName = process.env.APP_COMPANY_NAME?.trim() ?? "";
  const displayName = companyName ? `${appName} - ${companyName}` : appName;

  return {
    "WWW-Authenticate": `Basic realm="${displayName}", charset="UTF-8"`,
  };
}
