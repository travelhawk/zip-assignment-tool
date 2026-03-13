import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_SEARCH_HOTKEY,
  detectHotkeyFromKeyboardEvent,
  matchesHotkeyEvent,
  normalizeHotkey,
  tryNormalizeHotkey,
} from "./hotkey-settings.ts";

function createKeyboardEvent(
  overrides: Partial<{
    key: string;
    ctrlKey: boolean;
    altKey: boolean;
    shiftKey: boolean;
    metaKey: boolean;
  }> = {},
) {
  return {
    key: "",
    ctrlKey: false,
    altKey: false,
    shiftKey: false,
    metaKey: false,
    ...overrides,
  };
}

test("normalizeHotkey canonicalizes modifier combinations", () => {
  assert.equal(normalizeHotkey(" ctrl + alt + k "), "Ctrl+Alt+K");
  assert.equal(normalizeHotkey("commandorcontrol+k"), "Ctrl+K");
  assert.equal(normalizeHotkey("f12"), "F12");
});

test("normalizeHotkey rejects unsupported plain letter shortcuts", () => {
  assert.equal(tryNormalizeHotkey("K"), null);
  assert.equal(tryNormalizeHotkey("Shift"), null);
  assert.equal(normalizeHotkey("K"), DEFAULT_SEARCH_HOTKEY);
});

test("detectHotkeyFromKeyboardEvent captures combinations automatically", () => {
  assert.equal(
    detectHotkeyFromKeyboardEvent(
      createKeyboardEvent({
        key: "k",
        ctrlKey: true,
        altKey: true,
      }),
    ),
    "Ctrl+Alt+K",
  );

  assert.equal(detectHotkeyFromKeyboardEvent(createKeyboardEvent({ key: "F9" })), "F9");
  assert.equal(detectHotkeyFromKeyboardEvent(createKeyboardEvent({ key: "k" })), null);
  assert.equal(
    detectHotkeyFromKeyboardEvent(createKeyboardEvent({ key: "Control", ctrlKey: true })),
    null,
  );
});

test("matchesHotkeyEvent compares both modifiers and primary key", () => {
  assert.equal(
    matchesHotkeyEvent(
      "Ctrl+Alt+K",
      createKeyboardEvent({
        key: "k",
        ctrlKey: true,
        altKey: true,
      }),
    ),
    true,
  );

  assert.equal(
    matchesHotkeyEvent(
      "Ctrl+Alt+K",
      createKeyboardEvent({
        key: "k",
        ctrlKey: true,
      }),
    ),
    false,
  );
});
