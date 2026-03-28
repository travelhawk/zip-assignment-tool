import "server-only";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { initializeAnalyticsSchema } from "@/lib/analytics";
import { authRuntime } from "@/lib/env";
import { normalizeLocalityLoose, normalizeLocalityStrict } from "@/lib/normalization";

type CountRow = {
  count: number;
};

type MetadataRow = {
  value: string;
};

declare global {
  var __plzMiniToolDb: DatabaseSync | undefined;
  var __plzMiniToolDbReady: boolean | undefined;
  var __plzMiniToolDbReadyVersion: string | undefined;
}

const referenceFilePath = path.join(process.cwd(), "data", "reference", "DE.txt");
const POSTAL_REFERENCE_SEED_VERSION = "2026-03-14-utf8-v4";
const DATABASE_READY_VERSION = `${POSTAL_REFERENCE_SEED_VERSION}|2026-03-15-electron-login-v1`;

function openDatabase() {
  mkdirSync(path.dirname(authRuntime.dbPath), { recursive: true });
  return new DatabaseSync(authRuntime.dbPath);
}

function readMetadata(db: DatabaseSync, key: string) {
  const row = db
    .prepare("SELECT value FROM app_metadata WHERE key = ?")
    .get(key) as MetadataRow | undefined;

  return row?.value ?? null;
}

function writeMetadata(db: DatabaseSync, key: string, value: string) {
  db.prepare(`
    INSERT INTO app_metadata (key, value)
    VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(key, value);
}

function repairMojibake(value: string) {
  const trimmed = value.trim();

  if (!/[\u00C3\u00C2]/.test(trimmed)) {
    return trimmed;
  }

  const repaired = Buffer.from(trimmed, "latin1").toString("utf8");
  return repaired.includes("\uFFFD") ? trimmed : repaired;
}

function shouldReseedPostalReference(db: DatabaseSync) {
  const existing = db
    .prepare("SELECT COUNT(1) AS count FROM postal_reference")
    .get() as CountRow | undefined;

  if ((existing?.count ?? 0) === 0) {
    return true;
  }

  const currentVersion = readMetadata(db, "postal_reference_seed_version");

  if (currentVersion !== POSTAL_REFERENCE_SEED_VERSION) {
    return true;
  }

  const mojibake = db
    .prepare(`
      SELECT COUNT(1) AS count
      FROM postal_reference
      WHERE locality LIKE '%\u00C3%' OR locality LIKE '%\u00C2%'
    `)
    .get() as CountRow | undefined;

  return (mojibake?.count ?? 0) > 0;
}

function seedPostalReference(db: DatabaseSync) {
  if (!existsSync(referenceFilePath) || !shouldReseedPostalReference(db)) {
    return;
  }

  const contents = readFileSync(referenceFilePath, "utf8");
  const lines = contents.split(/\r?\n/);
  const insert = db.prepare(`
    INSERT OR IGNORE INTO postal_reference (
      postal_code,
      locality,
      admin1,
      admin2,
      normalized_locality,
      normalized_locality_loose
    ) VALUES (?, ?, ?, ?, ?, ?)
  `);

  db.exec("BEGIN IMMEDIATE");

  try {
    db.exec("DELETE FROM postal_reference");

    for (const line of lines) {
      if (!line.trim()) {
        continue;
      }

      const [countryCode, postalCode, locality, admin1, , admin2, , admin3] = line.split("\t");
      const normalizedLocality = repairMojibake(locality ?? "");
      const normalizedAdmin1 = repairMojibake(admin1 ?? "");
      const secondaryArea = repairMojibake(admin2?.trim() || admin3?.trim() || "");

      if (countryCode !== "DE" || !postalCode || !normalizedLocality) {
        continue;
      }

      insert.run(
        postalCode.trim(),
        normalizedLocality,
        normalizedAdmin1,
        secondaryArea,
        normalizeLocalityStrict(normalizedLocality),
        normalizeLocalityLoose(normalizedLocality),
      );
    }

    writeMetadata(db, "postal_reference_seed_version", POSTAL_REFERENCE_SEED_VERSION);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

function initializeDatabase(db: DatabaseSync) {
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS assignments (
      postal_code TEXT PRIMARY KEY,
      assignee_name TEXT NOT NULL,
      imported_at TEXT NOT NULL,
      imported_by TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS import_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_name TEXT NOT NULL,
      record_count INTEGER NOT NULL,
      imported_by TEXT NOT NULL,
      imported_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_metadata (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS electron_login_requests (
      request_id TEXT PRIMARY KEY,
      session_token TEXT,
      expires_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS postal_reference (
      postal_code TEXT NOT NULL,
      locality TEXT NOT NULL,
      admin1 TEXT NOT NULL DEFAULT '',
      admin2 TEXT NOT NULL DEFAULT '',
      normalized_locality TEXT NOT NULL,
      normalized_locality_loose TEXT NOT NULL,
      PRIMARY KEY (postal_code, locality)
    );

    CREATE INDEX IF NOT EXISTS idx_postal_reference_postal_code
      ON postal_reference (postal_code);

    CREATE INDEX IF NOT EXISTS idx_postal_reference_locality
      ON postal_reference (normalized_locality);

    CREATE INDEX IF NOT EXISTS idx_postal_reference_locality_loose
      ON postal_reference (normalized_locality_loose);
  `);

  initializeAnalyticsSchema(db);
  seedPostalReference(db);
}

export function getDatabase() {
  if (!globalThis.__plzMiniToolDb) {
    globalThis.__plzMiniToolDb = openDatabase();
  }

  if (
    !globalThis.__plzMiniToolDbReady ||
    globalThis.__plzMiniToolDbReadyVersion !== DATABASE_READY_VERSION
  ) {
    initializeDatabase(globalThis.__plzMiniToolDb);
    globalThis.__plzMiniToolDbReady = true;
    globalThis.__plzMiniToolDbReadyVersion = DATABASE_READY_VERSION;
  }

  return globalThis.__plzMiniToolDb;
}
