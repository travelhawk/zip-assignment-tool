import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

function readAppUrlFromArgs() {
  const explicitArg = process.argv.find((value) => value.startsWith("--app-url="));

  if (explicitArg) {
    return explicitArg.slice("--app-url=".length);
  }

  const flagIndex = process.argv.findIndex((value) => value === "--app-url");
  return flagIndex >= 0 ? process.argv[flagIndex + 1] : undefined;
}

const rawUrl = process.env.APP_WEB_URL?.trim() || readAppUrlFromArgs()?.trim();

if (!rawUrl) {
  console.error(
    "Provide APP_WEB_URL or pass --app-url=https://plz.contoso.com to npm run electron:pack.",
  );
  process.exit(1);
}

let normalizedUrl;
const companyName = process.env.APP_COMPANY_NAME?.trim() || "";

try {
  normalizedUrl = new URL(rawUrl).toString();
} catch {
  console.error("APP_WEB_URL must be a valid absolute URL.");
  process.exit(1);
}

const runtimeConfigPath = path.join(process.cwd(), "electron", "runtime-config.json");
mkdirSync(path.dirname(runtimeConfigPath), { recursive: true });
writeFileSync(
  runtimeConfigPath,
  JSON.stringify({ appUrl: normalizedUrl, companyName }, null, 2),
);

const command = process.platform === "win32" ? "npx.cmd" : "npx";
const result = spawnSync(command, ["electron-builder"], {
  stdio: "inherit",
});

process.exit(result.status ?? 1);
