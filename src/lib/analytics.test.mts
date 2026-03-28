import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import {
  getAnalyticsOverview,
  initializeAnalyticsSchema,
  recordImport,
  recordPageView,
  recordSearch,
} from "./analytics.ts";

test("analytics aggregates unique users and activity counts", () => {
  const db = new DatabaseSync(":memory:");
  initializeAnalyticsSchema(db);

  recordPageView(
    {
      authMethod: "entra",
      email: "admin@example.com",
      isAdmin: true,
      isSuperAdmin: false,
      name: "Admin User",
    },
    "/",
    db,
    "2026-03-01T10:00:00.000Z",
  );
  recordSearch(
    {
      authMethod: "entra",
      email: "admin@example.com",
      isAdmin: true,
      isSuperAdmin: false,
      name: "Admin User",
    },
    db,
    "2026-03-20T10:00:00.000Z",
  );
  recordImport(
    {
      authMethod: "entra",
      email: "super@example.com",
      isAdmin: true,
      isSuperAdmin: true,
      name: "Super User",
    },
    db,
    "2026-03-28T08:30:00.000Z",
  );
  recordPageView(
    {
      authMethod: "entra",
      email: "user@example.com",
      isAdmin: false,
      isSuperAdmin: false,
      name: "Normal User",
    },
    "/",
    db,
    "2026-03-27T11:15:00.000Z",
  );

  const overview = getAnalyticsOverview(db, new Date("2026-03-28T12:00:00.000Z"));

  assert.deepEqual(
    {
      totalUsers: overview.totalUsers,
      activeUsers7d: overview.activeUsers7d,
      activeUsers30d: overview.activeUsers30d,
      totalPageViews: overview.totalPageViews,
      totalSearches: overview.totalSearches,
      totalImports: overview.totalImports,
    },
    {
      totalUsers: 3,
      activeUsers7d: 2,
      activeUsers30d: 3,
      totalPageViews: 2,
      totalSearches: 1,
      totalImports: 1,
    },
  );

  assert.equal(overview.recentUsers[0]?.email, "super@example.com");
  assert.equal(overview.recentUsers[0]?.isSuperAdmin, true);
  assert.equal(overview.recentUsers[0]?.importCount, 1);
  assert.equal(overview.recentUsers[1]?.email, "user@example.com");
  assert.equal(overview.recentUsers[2]?.email, "admin@example.com");
  assert.equal(overview.recentUsers[2]?.searchCount, 1);
});
