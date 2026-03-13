export const DEFAULT_SEARCH_HOTKEY = "F9";
export const HOTKEY_CHANGE_EVENT = "plz-search-hotkey-change";
const HOTKEY_STORAGE_KEY = "plz-search-hotkey";

const MODIFIER_ORDER = ["Ctrl", "Alt", "Shift", "Meta"] as const;
const SINGLE_CHARACTER_KEY_PATTERN = /^[A-Z0-9]$/;
const FUNCTION_KEY_PATTERN = /^F(?:[1-9]|1\d|2[0-4])$/;

type HotkeyModifier = (typeof MODIFIER_ORDER)[number];

type ParsedHotkey = {
  modifiers: HotkeyModifier[];
  key: string;
};

function normalizeModifier(value: string | null | undefined) {
  const candidate = value?.trim().replaceAll(" ", "").toUpperCase() ?? "";

  switch (candidate) {
    case "CTRL":
    case "CONTROL":
    case "COMMANDORCONTROL":
    case "CMDORCTRL":
      return "Ctrl" satisfies HotkeyModifier;
    case "ALT":
    case "OPTION":
      return "Alt" satisfies HotkeyModifier;
    case "SHIFT":
      return "Shift" satisfies HotkeyModifier;
    case "META":
    case "COMMAND":
    case "CMD":
    case "SUPER":
    case "WIN":
    case "WINDOWS":
    case "OS":
      return "Meta" satisfies HotkeyModifier;
    default:
      return null;
  }
}

function normalizePrimaryKey(value: string | null | undefined) {
  const candidate = value?.trim().toUpperCase() ?? "";

  if (FUNCTION_KEY_PATTERN.test(candidate) || SINGLE_CHARACTER_KEY_PATTERN.test(candidate)) {
    return candidate;
  }

  return null;
}

function sortModifiers(modifiers: Iterable<HotkeyModifier>) {
  const uniqueValues = new Set(modifiers);
  return MODIFIER_ORDER.filter((modifier) => uniqueValues.has(modifier));
}

function formatHotkey(value: ParsedHotkey) {
  return [...value.modifiers, value.key].join("+");
}

function parseHotkey(value: string | null | undefined): ParsedHotkey | null {
  const segments = value
    ?.split("+")
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (!segments?.length) {
    return null;
  }

  const modifiers = new Set<HotkeyModifier>();
  let primaryKey: string | null = null;

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

export function isModifierHotkeyKey(value: string | null | undefined) {
  return Boolean(normalizeModifier(value));
}

export function tryNormalizeHotkey(value: string | null | undefined) {
  const parsedValue = parseHotkey(value);
  return parsedValue ? formatHotkey(parsedValue) : null;
}

export function normalizeHotkey(value: string | null | undefined) {
  return tryNormalizeHotkey(value) ?? DEFAULT_SEARCH_HOTKEY;
}

export function detectHotkeyFromKeyboardEvent(
  event: Pick<KeyboardEvent, "key" | "ctrlKey" | "altKey" | "shiftKey" | "metaKey">,
) {
  const primaryKey = normalizePrimaryKey(event.key);

  if (!primaryKey) {
    return null;
  }

  const modifiers = sortModifiers([
    ...(event.ctrlKey ? (["Ctrl"] as const) : []),
    ...(event.altKey ? (["Alt"] as const) : []),
    ...(event.shiftKey ? (["Shift"] as const) : []),
    ...(event.metaKey ? (["Meta"] as const) : []),
  ]);

  if (SINGLE_CHARACTER_KEY_PATTERN.test(primaryKey) && modifiers.length === 0) {
    return null;
  }

  return formatHotkey({
    modifiers,
    key: primaryKey,
  });
}

export function matchesHotkeyEvent(
  hotkey: string,
  event: Pick<KeyboardEvent, "key" | "ctrlKey" | "altKey" | "shiftKey" | "metaKey">,
) {
  const expectedValue = tryNormalizeHotkey(hotkey);

  if (!expectedValue) {
    return false;
  }

  return detectHotkeyFromKeyboardEvent(event) === expectedValue;
}

export function readStoredHotkey() {
  if (typeof window === "undefined") {
    return DEFAULT_SEARCH_HOTKEY;
  }

  return normalizeHotkey(window.localStorage.getItem(HOTKEY_STORAGE_KEY));
}

export function writeStoredHotkey(value: string) {
  if (typeof window === "undefined") {
    return DEFAULT_SEARCH_HOTKEY;
  }

  const nextValue = normalizeHotkey(value);
  window.localStorage.setItem(HOTKEY_STORAGE_KEY, nextValue);
  window.dispatchEvent(new CustomEvent(HOTKEY_CHANGE_EVENT, { detail: nextValue }));
  return nextValue;
}
