import assert from "node:assert/strict";
import test from "node:test";
import {
  buildSearchApiPath,
  buildSearchLocation,
  normalizeSearchQuery,
  readSearchQueryFromUrl,
} from "./search-url-state.ts";

test("normalizeSearchQuery trims whitespace and falls back to empty string", () => {
  assert.equal(normalizeSearchQuery("  Berlin  "), "Berlin");
  assert.equal(normalizeSearchQuery("   "), "");
  assert.equal(normalizeSearchQuery(undefined), "");
});

test("buildSearchApiPath encodes the normalized query", () => {
  assert.equal(buildSearchApiPath("Bad Homburg"), "/api/search?q=Bad+Homburg");
});

test("buildSearchLocation updates q while preserving other params and hash", () => {
  assert.equal(
    buildSearchLocation("https://example.com/?foo=bar&q=Berlin#results", "10115"),
    "/?foo=bar&q=10115#results",
  );
});

test("buildSearchLocation removes q when the query is empty", () => {
  assert.equal(
    buildSearchLocation("https://example.com/?foo=bar&q=Berlin#results", "   "),
    "/?foo=bar#results",
  );
});

test("readSearchQueryFromUrl reads and trims q", () => {
  assert.equal(readSearchQueryFromUrl("https://example.com/?q=%20Berlin%20"), "Berlin");
  assert.equal(readSearchQueryFromUrl("https://example.com/?foo=bar"), "");
});
