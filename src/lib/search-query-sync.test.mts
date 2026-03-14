import assert from "node:assert/strict";
import test from "node:test";
import { shouldSyncSearchValueFromUrl } from "./search-query-sync.ts";

test("syncs when the URL already matches the current local value", () => {
  assert.equal(
    shouldSyncSearchValueFromUrl({
      localValue: "10115",
      requestedQuery: "1011",
      urlQuery: "10115",
    }),
    true,
  );
});

test("ignores a late internal router update when the user has already typed more", () => {
  assert.equal(
    shouldSyncSearchValueFromUrl({
      localValue: "10115",
      requestedQuery: "1011",
      urlQuery: "1011",
    }),
    false,
  );
});

test("accepts external URL changes that did not come from the latest local request", () => {
  assert.equal(
    shouldSyncSearchValueFromUrl({
      localValue: "10115",
      requestedQuery: "1011",
      urlQuery: "Berlin",
    }),
    true,
  );
});
