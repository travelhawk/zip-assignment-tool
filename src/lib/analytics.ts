import type { DatabaseSync } from "node:sqlite";

export type AnalyticsActor = {
  authMethod: "entra" | "basic";
  email: string | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  name: string | null;
};

type UsageSummaryRow = {
  totalUsers: number;
  activeUsers7d: number;
  activeUsers30d: number;
  totalPageViews: number;
  totalSearches: number;
  totalImports: number;
};

type RecentUserRow = {
  email: string | null;
  displayName: string | null;
  authMethod: "entra" | "basic";
  isAdmin: number;
  isSuperAdmin: number;
  firstSeenAt: string;
  lastSeenAt: string;
  lastSeenPath: string;
  pageViewCount: number;
  searchCount: number;
  importCount: number;
  lastSearchAt: string | null;
  lastImportAt: string | null;
};

export type AnalyticsUserSummary = {
  email: string | null;
  displayName: string | null;
  authMethod: "entra" | "basic";
  isAdmin: boolean;
  isSuperAdmin: boolean;
  firstSeenAt: string;
  lastSeenAt: string;
  lastSeenPath: string;
  pageViewCount: number;
  searchCount: number;
  importCount: number;
  lastSearchAt: string | null;
  lastImportAt: string | null;
};

export type AnalyticsOverview = {
  totalUsers: number;
  activeUsers7d: number;
  activeUsers30d: number;
  totalPageViews: number;
  totalSearches: number;
  totalImports: number;
  recentUsers: AnalyticsUserSummary[];
};

type UsageEvent = "page-view" | "search" | "import";

export function initializeAnalyticsSchema(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS usage_users (
      user_key TEXT PRIMARY KEY,
      email TEXT,
      display_name TEXT,
      auth_method TEXT NOT NULL,
      is_admin INTEGER NOT NULL DEFAULT 0,
      is_super_admin INTEGER NOT NULL DEFAULT 0,
      first_seen_at TEXT NOT NULL,
      last_seen_at TEXT NOT NULL,
      last_seen_path TEXT NOT NULL,
      page_view_count INTEGER NOT NULL DEFAULT 0,
      search_count INTEGER NOT NULL DEFAULT 0,
      import_count INTEGER NOT NULL DEFAULT 0,
      last_search_at TEXT,
      last_import_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_usage_users_last_seen_at
      ON usage_users (last_seen_at DESC);
  `);
}

function normalizeText(value: string | null | undefined) {
  const normalizedValue = value?.trim() ?? "";
  return normalizedValue || null;
}

function normalizeEmail(email: string | null | undefined) {
  return normalizeText(email)?.toLowerCase() ?? null;
}

function resolveUserKey(user: AnalyticsActor) {
  const normalizedEmail = normalizeEmail(user.email);

  if (normalizedEmail) {
    return normalizedEmail;
  }

  const normalizedName = normalizeText(user.name)?.toLowerCase();
  return `${user.authMethod}:${normalizedName ?? "anonymous"}`;
}

function normalizePathname(pathname: string | null | undefined) {
  const trimmedPathname = pathname?.trim() ?? "";

  if (!trimmedPathname || !trimmedPathname.startsWith("/")) {
    return "/";
  }

  return trimmedPathname.slice(0, 120);
}

function boolToInt(value: boolean) {
  return value ? 1 : 0;
}

function recordUsageEvent(
  user: AnalyticsActor,
  event: UsageEvent,
  pathname: string,
  db: DatabaseSync,
  occurredAt = new Date().toISOString(),
) {
  initializeAnalyticsSchema(db);

  const normalizedEmail = normalizeEmail(user.email);
  const normalizedName = normalizeText(user.name);
  const normalizedPathname = normalizePathname(pathname);
  const pageViewCount = event === "page-view" ? 1 : 0;
  const searchCount = event === "search" ? 1 : 0;
  const importCount = event === "import" ? 1 : 0;
  const lastSearchAt = event === "search" ? occurredAt : null;
  const lastImportAt = event === "import" ? occurredAt : null;

  db.prepare(`
    INSERT INTO usage_users (
      user_key,
      email,
      display_name,
      auth_method,
      is_admin,
      is_super_admin,
      first_seen_at,
      last_seen_at,
      last_seen_path,
      page_view_count,
      search_count,
      import_count,
      last_search_at,
      last_import_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_key) DO UPDATE SET
      email = excluded.email,
      display_name = excluded.display_name,
      auth_method = excluded.auth_method,
      is_admin = excluded.is_admin,
      is_super_admin = excluded.is_super_admin,
      last_seen_at = excluded.last_seen_at,
      last_seen_path = excluded.last_seen_path,
      page_view_count = usage_users.page_view_count + excluded.page_view_count,
      search_count = usage_users.search_count + excluded.search_count,
      import_count = usage_users.import_count + excluded.import_count,
      last_search_at = COALESCE(excluded.last_search_at, usage_users.last_search_at),
      last_import_at = COALESCE(excluded.last_import_at, usage_users.last_import_at)
  `).run(
    resolveUserKey(user),
    normalizedEmail,
    normalizedName,
    user.authMethod,
    boolToInt(user.isAdmin),
    boolToInt(user.isSuperAdmin),
    occurredAt,
    occurredAt,
    normalizedPathname,
    pageViewCount,
    searchCount,
    importCount,
    lastSearchAt,
    lastImportAt,
  );
}

export function recordPageView(
  user: AnalyticsActor,
  pathname: string,
  db: DatabaseSync,
  occurredAt?: string,
) {
  recordUsageEvent(user, "page-view", pathname, db, occurredAt);
}

export function recordSearch(
  user: AnalyticsActor,
  db: DatabaseSync,
  occurredAt?: string,
) {
  recordUsageEvent(user, "search", "/", db, occurredAt);
}

export function recordImport(
  user: AnalyticsActor,
  db: DatabaseSync,
  occurredAt?: string,
) {
  recordUsageEvent(user, "import", "/admin", db, occurredAt);
}

export function getAnalyticsOverview(
  db: DatabaseSync,
  now = new Date(),
  recentUserLimit = 12,
) {
  initializeAnalyticsSchema(db);

  const activeUsers7dThreshold = new Date(now);
  activeUsers7dThreshold.setDate(activeUsers7dThreshold.getDate() - 7);

  const activeUsers30dThreshold = new Date(now);
  activeUsers30dThreshold.setDate(activeUsers30dThreshold.getDate() - 30);

  const summary = db
    .prepare(`
      SELECT
        COUNT(1) AS totalUsers,
        COALESCE(SUM(CASE WHEN last_seen_at >= ? THEN 1 ELSE 0 END), 0) AS activeUsers7d,
        COALESCE(SUM(CASE WHEN last_seen_at >= ? THEN 1 ELSE 0 END), 0) AS activeUsers30d,
        COALESCE(SUM(page_view_count), 0) AS totalPageViews,
        COALESCE(SUM(search_count), 0) AS totalSearches,
        COALESCE(SUM(import_count), 0) AS totalImports
      FROM usage_users
    `)
    .get(
      activeUsers7dThreshold.toISOString(),
      activeUsers30dThreshold.toISOString(),
    ) as UsageSummaryRow;

  const recentUsers = db
    .prepare(`
      SELECT
        email,
        display_name AS displayName,
        auth_method AS authMethod,
        is_admin AS isAdmin,
        is_super_admin AS isSuperAdmin,
        first_seen_at AS firstSeenAt,
        last_seen_at AS lastSeenAt,
        last_seen_path AS lastSeenPath,
        page_view_count AS pageViewCount,
        search_count AS searchCount,
        import_count AS importCount,
        last_search_at AS lastSearchAt,
        last_import_at AS lastImportAt
      FROM usage_users
      ORDER BY last_seen_at DESC, user_key ASC
      LIMIT ?
    `)
    .all(recentUserLimit) as RecentUserRow[];

  return {
    totalUsers: summary.totalUsers,
    activeUsers7d: summary.activeUsers7d,
    activeUsers30d: summary.activeUsers30d,
    totalPageViews: summary.totalPageViews,
    totalSearches: summary.totalSearches,
    totalImports: summary.totalImports,
    recentUsers: recentUsers.map((user) => ({
      email: user.email,
      displayName: user.displayName,
      authMethod: user.authMethod,
      isAdmin: Boolean(user.isAdmin),
      isSuperAdmin: Boolean(user.isSuperAdmin),
      firstSeenAt: user.firstSeenAt,
      lastSeenAt: user.lastSeenAt,
      lastSeenPath: user.lastSeenPath,
      pageViewCount: user.pageViewCount,
      searchCount: user.searchCount,
      importCount: user.importCount,
      lastSearchAt: user.lastSearchAt,
      lastImportAt: user.lastImportAt,
    })),
  } satisfies AnalyticsOverview;
}
