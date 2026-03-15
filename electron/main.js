/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("node:fs");
const path = require("node:path");
const {
  app,
  BrowserWindow,
  globalShortcut,
  ipcMain,
  shell,
} = require("electron");

const DEFAULT_GLOBAL_SHORTCUT = "F9";
const MODIFIER_ORDER = ["Ctrl", "Alt", "Shift", "Meta"];
const SINGLE_CHARACTER_KEY_PATTERN = /^[A-Z0-9]$/;
const FUNCTION_KEY_PATTERN = /^F(?:[1-9]|1\d|2[0-4])$/;
const APP_NAME = "PLZ-Zuordnung";
const ELECTRON_PROTOCOL = "plz-zuordnung";
const gotTheLock = app.requestSingleInstanceLock();
let mainWindow = null;
let currentGlobalShortcut = DEFAULT_GLOBAL_SHORTCUT;
let pendingDeepLink = process.platform === "win32" ? extractProtocolUrl(process.argv) : null;

function formatDisplayName(companyName) {
  return companyName ? `${APP_NAME} - ${companyName}` : APP_NAME;
}

function getRuntimeConfig() {
  const fallback = {
    appUrl: process.env.APP_WEB_URL || "http://localhost:3000",
    companyName: process.env.APP_COMPANY_NAME || "",
  };

  if (!app.isPackaged) {
    return fallback;
  }

  const configPath = path.join(__dirname, "runtime-config.json");

  if (!fs.existsSync(configPath)) {
    return {
      appUrl: null,
      companyName: fallback.companyName,
    };
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(configPath, "utf8"));
    return {
      appUrl: typeof parsed.appUrl === "string" ? parsed.appUrl : null,
      companyName:
        typeof parsed.companyName === "string" ? parsed.companyName : fallback.companyName,
    };
  } catch {
    return {
      appUrl: null,
      companyName: fallback.companyName,
    };
  }
}

function getHotkeyConfigPath() {
  return path.join(app.getPath("userData"), "hotkey-config.json");
}

function extractProtocolUrl(values) {
  if (!Array.isArray(values)) {
    return null;
  }

  return values.find((value) => typeof value === "string" && value.startsWith(`${ELECTRON_PROTOCOL}://`)) ?? null;
}

function registerProtocolClient() {
  if (process.defaultApp && process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(ELECTRON_PROTOCOL, process.execPath, [path.resolve(process.argv[1])]);
    return;
  }

  app.setAsDefaultProtocolClient(ELECTRON_PROTOCOL);
}

function buildElectronExchangeUrl(baseUrl, requestId) {
  const exchangeUrl = new URL("/electron-auth/exchange", baseUrl);
  exchangeUrl.searchParams.set("request", requestId);
  return exchangeUrl.toString();
}

function normalizeModifier(value) {
  const candidate =
    typeof value === "string" ? value.trim().replaceAll(" ", "").toUpperCase() : "";

  switch (candidate) {
    case "CTRL":
    case "CONTROL":
    case "COMMANDORCONTROL":
    case "CMDORCTRL":
      return "Ctrl";
    case "ALT":
    case "OPTION":
      return "Alt";
    case "SHIFT":
      return "Shift";
    case "META":
    case "COMMAND":
    case "CMD":
    case "SUPER":
    case "WIN":
    case "WINDOWS":
    case "OS":
      return "Meta";
    default:
      return null;
  }
}

function normalizePrimaryKey(value) {
  const candidate = typeof value === "string" ? value.trim().toUpperCase() : "";

  if (FUNCTION_KEY_PATTERN.test(candidate) || SINGLE_CHARACTER_KEY_PATTERN.test(candidate)) {
    return candidate;
  }

  return null;
}

function sortModifiers(modifiers) {
  const uniqueValues = new Set(modifiers);
  return MODIFIER_ORDER.filter((modifier) => uniqueValues.has(modifier));
}

function parseShortcut(value) {
  const segments =
    typeof value === "string"
      ? value
          .split("+")
          .map((segment) => segment.trim())
          .filter(Boolean)
      : [];

  if (!segments.length) {
    return null;
  }

  const modifiers = new Set();
  let primaryKey = null;

  for (const segment of segments) {
    const modifier = normalizeModifier(segment);

    if (modifier) {
      modifiers.add(modifier);
      continue;
    }

    const normalizedKey = normalizePrimaryKey(segment);

    if (!normalizedKey || primaryKey) {
      return null;
    }

    primaryKey = normalizedKey;
  }

  if (!primaryKey) {
    return null;
  }

  if (SINGLE_CHARACTER_KEY_PATTERN.test(primaryKey) && modifiers.size === 0) {
    return null;
  }

  return {
    modifiers: sortModifiers(modifiers),
    key: primaryKey,
  };
}

function formatShortcut(value) {
  return [...value.modifiers, value.key].join("+");
}

function normalizeShortcut(value) {
  const parsedValue = parseShortcut(value);
  return parsedValue ? formatShortcut(parsedValue) : DEFAULT_GLOBAL_SHORTCUT;
}

function toElectronAccelerator(value) {
  const parsedValue = parseShortcut(value) || parseShortcut(DEFAULT_GLOBAL_SHORTCUT);
  const modifierMap = {
    Ctrl: "Control",
    Alt: "Alt",
    Shift: "Shift",
    Meta: process.platform === "darwin" ? "Command" : "Super",
  };

  return [...parsedValue.modifiers.map((modifier) => modifierMap[modifier]), parsedValue.key].join(
    "+",
  );
}

function readStoredShortcut() {
  try {
    const raw = fs.readFileSync(getHotkeyConfigPath(), "utf8");
    const parsed = JSON.parse(raw);
    return normalizeShortcut(parsed.searchHotkey);
  } catch {
    return DEFAULT_GLOBAL_SHORTCUT;
  }
}

function writeStoredShortcut(value) {
  const nextValue = normalizeShortcut(value);

  try {
    fs.mkdirSync(path.dirname(getHotkeyConfigPath()), { recursive: true });
    fs.writeFileSync(
      getHotkeyConfigPath(),
      JSON.stringify({ searchHotkey: nextValue }, null, 2),
      "utf8",
    );
  } catch {}

  return nextValue;
}

function focusSearchField() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  mainWindow.webContents.executeJavaScript(
    "window.focus(); document.querySelector('[data-search-input=\"true\"]')?.focus();",
  );
}

function handleGlobalShortcut() {
  const window = createWindow();

  if (window.isMinimized()) {
    window.restore();
  }

  window.show();
  window.focus();
  focusSearchField();
}

function openDesktopLoginInBrowser(startUrl) {
  if (typeof startUrl !== "string" || !startUrl.trim()) {
    throw new Error("Keine Browser-URL fuer die Electron-Anmeldung erhalten.");
  }

  return shell.openExternal(startUrl);
}

function handleProtocolUrl(url) {
  if (!url) {
    return;
  }

  const runtimeConfig = getRuntimeConfig();

  if (!runtimeConfig.appUrl) {
    return;
  }

  const parsedUrl = new URL(url);
  const requestId = parsedUrl.searchParams.get("request")?.trim();

  if (!requestId) {
    return;
  }

  const window = createWindow();

  if (window.isMinimized()) {
    window.restore();
  }

  window.show();
  window.focus();
  window.loadURL(buildElectronExchangeUrl(runtimeConfig.appUrl, requestId));
}

function registerSearchShortcut(value) {
  const requestedValue = normalizeShortcut(value);
  const requestedAccelerator = toElectronAccelerator(requestedValue);
  const candidates =
    requestedValue === DEFAULT_GLOBAL_SHORTCUT
      ? [{ displayValue: requestedValue, accelerator: requestedAccelerator }]
      : [
          { displayValue: requestedValue, accelerator: requestedAccelerator },
          {
            displayValue: DEFAULT_GLOBAL_SHORTCUT,
            accelerator: toElectronAccelerator(DEFAULT_GLOBAL_SHORTCUT),
          },
        ];

  globalShortcut.unregisterAll();

  for (const candidate of candidates) {
    if (globalShortcut.register(candidate.accelerator, handleGlobalShortcut)) {
      currentGlobalShortcut = candidate.displayValue;
      return writeStoredShortcut(candidate.displayValue);
    }
  }

  currentGlobalShortcut = DEFAULT_GLOBAL_SHORTCUT;
  return currentGlobalShortcut;
}

function createWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    return mainWindow;
  }

  const runtimeConfig = getRuntimeConfig();
  const displayName = formatDisplayName(runtimeConfig.companyName.trim());

  mainWindow = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 1100,
    minHeight: 720,
    autoHideMenuBar: true,
    show: false,
    backgroundColor: "#f4efe7",
    title: displayName,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
    focusSearchField();
  });
  mainWindow.removeMenu();

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  const targetUrl = runtimeConfig.appUrl;

  if (targetUrl) {
    mainWindow.loadURL(targetUrl);
  } else {
    mainWindow.loadURL(
      "data:text/html;charset=utf-8," +
        encodeURIComponent(`
          <html>
            <body style="font-family:Segoe UI,sans-serif;background:#f4efe7;color:#18212b;padding:40px">
              <h1>${displayName}</h1>
              <p>Keine Web-URL fuer die Electron-Version konfiguriert.</p>
              <p>Bitte die App mit APP_WEB_URL neu bauen.</p>
            </body>
          </html>
        `),
    );
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  return mainWindow;
}

if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", (_event, commandLine) => {
    const protocolUrl = extractProtocolUrl(commandLine);

    if (protocolUrl) {
      handleProtocolUrl(protocolUrl);
      return;
    }

    const window = createWindow();

    if (window.isMinimized()) {
      window.restore();
    }

    window.show();
    window.focus();
  });

  app.on("open-url", (event, url) => {
    event.preventDefault();
    handleProtocolUrl(url);
  });

  app.whenReady().then(() => {
    registerProtocolClient();
    createWindow();
    currentGlobalShortcut = readStoredShortcut();
    registerSearchShortcut(currentGlobalShortcut);
    ipcMain.handle("search-hotkey:get", () => currentGlobalShortcut);
    ipcMain.handle("search-hotkey:set", (_event, value) => registerSearchShortcut(value));
    ipcMain.handle("desktop-auth:start", async (_event, startUrl) => {
      await openDesktopLoginInBrowser(startUrl);
    });

    if (pendingDeepLink) {
      handleProtocolUrl(pendingDeepLink);
      pendingDeepLink = null;
    }

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });
}

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
