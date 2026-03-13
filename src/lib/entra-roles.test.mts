import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_ADMIN_ENTRA_ROLE_VALUES,
  extractEntraRoles,
  hasAnyEntraRole,
  hasEntraRole,
  isAdminEntraUser,
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
    hasEntraRole({ roles: ["search", "Assignment.Import"] }, "assignment.import"),
    true,
  );
  assert.equal(hasEntraRole({ roles: ["search"] }, "Assignment.Import"), false);
});

test("hasAnyEntraRole matches any configured admin role value", () => {
  assert.equal(
    hasAnyEntraRole({ roles: ["Assignment.Import"] }, DEFAULT_ADMIN_ENTRA_ROLE_VALUES),
    true,
  );
  assert.equal(
    hasAnyEntraRole({ roles: ["search"] }, DEFAULT_ADMIN_ENTRA_ROLE_VALUES),
    false,
  );
});

test("isAdminEntraUser accepts stored token role arrays", () => {
  assert.equal(isAdminEntraUser(["assignment.import", "search"]), true);
  assert.equal(isAdminEntraUser(["search"]), false);
});
