import path from "node:path";

export type AuthMethod = "entra" | "basic";
const APP_NAME = "PLZ-Zuordnung";

function readEnv(name: string) {
  return process.env[name]?.trim() ?? "";
}

function readListEnv(name: string, fallback: string[]) {
  const value = readEnv(name);

  if (!value) {
    return fallback;
  }

  const parsedValues = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return parsedValues.length ? parsedValues : fallback;
}

const tenantId = readEnv("AUTH_MICROSOFT_ENTRA_ID_TENANT_ID");
const authMethod = readEnv("AUTH_METHOD").toLowerCase() === "basic" ? "basic" : "entra";
const basicAuthUsername = readEnv("BASIC_AUTH_USERNAME") || "tester";
const companyName = readEnv("APP_COMPANY_NAME");

const missingAuthEnvVars = [
  "AUTH_SECRET",
  "AUTH_MICROSOFT_ENTRA_ID_ID",
  "AUTH_MICROSOFT_ENTRA_ID_SECRET",
  "AUTH_MICROSOFT_ENTRA_ID_TENANT_ID",
].filter((name) => !readEnv(name));

const missingBasicAuthEnvVars = ["BASIC_AUTH_PASSWORD"].filter(
  (name) => !readEnv(name),
);

export const appRuntime = {
  appName: APP_NAME,
  companyName,
  displayName: companyName ? `${APP_NAME} - ${companyName}` : APP_NAME,
};

export const authRuntime = {
  method: authMethod satisfies AuthMethod,
  authSecret: readEnv("AUTH_SECRET") || "replace-me-before-production",
  clientId: readEnv("AUTH_MICROSOFT_ENTRA_ID_ID") || "missing-client-id",
  clientSecret:
    readEnv("AUTH_MICROSOFT_ENTRA_ID_SECRET") || "missing-client-secret",
  tenantId: tenantId || "missing-tenant-id",
  issuer: tenantId
    ? `https://login.microsoftonline.com/${tenantId}/v2.0`
    : "https://login.microsoftonline.com/common/v2.0",
  adminEntraRoleValues: readListEnv("AUTH_MICROSOFT_ENTRA_ID_ADMIN_ROLE_VALUES", ["Admin"]),
  superAdminEntraRoleValues: readListEnv(
    "AUTH_MICROSOFT_ENTRA_ID_SUPER_ADMIN_ROLE_VALUES",
    ["SuperAdmin"],
  ),
  basicAuth: {
    username: basicAuthUsername,
    password: readEnv("BASIC_AUTH_PASSWORD"),
    email: `${basicAuthUsername.toLowerCase()}@local.test`,
    displayName: readEnv("BASIC_AUTH_DISPLAY_NAME") || "Basic Auth Tester",
  },
  missingAuthEnvVars: authMethod === "basic" ? missingBasicAuthEnvVars : missingAuthEnvVars,
  isReady:
    authMethod === "basic"
      ? missingBasicAuthEnvVars.length === 0
      : missingAuthEnvVars.length === 0,
  dbPath: readEnv("PLZ_DB_PATH") || path.join(process.cwd(), "data", "app.db"),
};
