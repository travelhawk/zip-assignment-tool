import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_ADMIN_ENTRA_ROLE_VALUES,
  DEFAULT_SUPER_ADMIN_ENTRA_ROLE_VALUES,
  extractEntraRoles,
  hasAnyEntraRole,
  hasEntraRole,
  isAdminEntraUser,
  isSuperAdminEntraUser,
  resolveEntraAccess,
} from "./entra-roles.ts";

test("extractEntraRoles normalizes, deduplicates, and ignores invalid values", () => {
  assert.deepEqual(
    extractEntraRoles({
      roles: ["Admin", " admin ", "Importer", "", null],
    }),
    ["admin", "importer"],
  );
});

test("hasEntraRole matches role names case-insensitively", () => {
  assert.equal(
    hasEntraRole({ roles: ["search", "Admin"] }, "admin"),
    true,
  );
  assert.equal(hasEntraRole({ roles: ["search"] }, "Admin"), false);
});

test("hasAnyEntraRole matches any configured admin role value", () => {
  assert.equal(
    hasAnyEntraRole({ roles: ["Admin"] }, DEFAULT_ADMIN_ENTRA_ROLE_VALUES),
    true,
  );
  assert.equal(
    hasAnyEntraRole({ roles: ["search"] }, DEFAULT_ADMIN_ENTRA_ROLE_VALUES),
    false,
  );
});

test("default role lists use Admin and SuperAdmin", () => {
  assert.deepEqual(DEFAULT_ADMIN_ENTRA_ROLE_VALUES, ["Admin"]);
  assert.deepEqual(DEFAULT_SUPER_ADMIN_ENTRA_ROLE_VALUES, ["SuperAdmin"]);
});

test("legacy Assignment.Import no longer grants admin access by default", () => {
  assert.equal(isAdminEntraUser(["assignment.import", "search"]), false);
  assert.equal(isAdminEntraUser(["search"]), false);
});

test("super admins get super admin access and import access", () => {
  assert.equal(isSuperAdminEntraUser(["superadmin", "search"]), true);
  assert.deepEqual(resolveEntraAccess(["superadmin", "search"]), {
    isAdmin: true,
    isSuperAdmin: true,
  });
  assert.deepEqual(resolveEntraAccess(["admin", "search"]), {
    isAdmin: true,
    isSuperAdmin: false,
  });
});
