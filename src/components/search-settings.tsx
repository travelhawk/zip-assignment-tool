"use client";

import { useEffect, useRef, useState } from "react";
import {
  DEFAULT_SEARCH_HOTKEY,
  HOTKEY_CHANGE_EVENT,
  detectHotkeyFromKeyboardEvent,
  isModifierHotkeyKey,
  readStoredHotkey,
  writeStoredHotkey,
} from "@/lib/hotkey-settings";

export function SearchSettings() {
  const [isOpen, setIsOpen] = useState(false);
  const [hotkey, setHotkey] = useState(() => readStoredHotkey());
  const [isCapturing, setIsCapturing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const captureButtonRef = useRef<HTMLButtonElement>(null);

  function closePanel() {
    setIsOpen(false);
    setIsCapturing(false);
    setStatusMessage(null);
  }

  useEffect(() => {
    let isCancelled = false;
    const electronHotkey = window.electronHotkey;

    if (!electronHotkey) {
      return () => {
        isCancelled = true;
      };
    }

    electronHotkey
      .get()
      .then((value) => {
        if (isCancelled) {
          return;
        }

        const nextValue = writeStoredHotkey(value);
        setHotkey(nextValue);
      })
      .catch(() => {});

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isOpen || !isCapturing) {
      return;
    }

    captureButtonRef.current?.focus();
  }, [isCapturing, isOpen]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!panelRef.current?.contains(event.target as Node)) {
        closePanel();
      }
    }

    function handleHotkeyChange(event: Event) {
      const nextValue = event instanceof CustomEvent ? String(event.detail ?? "") : "";
      setHotkey(nextValue || readStoredHotkey());
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !isCapturing) {
        closePanel();
      }
    }

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener(HOTKEY_CHANGE_EVENT, handleHotkeyChange);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener(HOTKEY_CHANGE_EVENT, handleHotkeyChange);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isCapturing]);

  async function updateHotkey(value: string) {
    const nextValue = writeStoredHotkey(value);
    setHotkey(nextValue);
    const electronHotkey = window.electronHotkey;

    if (!electronHotkey) {
      setIsCapturing(false);
      setStatusMessage(`Gespeichert: ${nextValue}`);
      return;
    }

    const syncedValue = await electronHotkey.set(nextValue).catch(() => nextValue);

    const persistedValue = writeStoredHotkey(syncedValue || nextValue);
    setHotkey(persistedValue);
    setIsCapturing(false);
    setStatusMessage(
      persistedValue === nextValue
        ? `Gespeichert: ${persistedValue}`
        : `Nicht verfügbar. Verwende stattdessen ${persistedValue}.`,
    );
  }

  async function handleCaptureKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    if (event.key === "Escape") {
      setIsCapturing(false);
      setStatusMessage(null);
      return;
    }

    const nextHotkey = detectHotkeyFromKeyboardEvent(event.nativeEvent);

    if (!nextHotkey) {
      setIsCapturing(true);
      setStatusMessage(
        isModifierHotkeyKey(event.key)
          ? "Kombination weiter drücken."
          : "Nutze F-Tasten oder Kombinationen wie Ctrl+Alt+K.",
      );
      return;
    }

    await updateHotkey(nextHotkey);
  }

  return (
    <div ref={panelRef} className="relative z-40">
      <button
        type="button"
        aria-label="Einstellungen"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        onClick={() => {
          if (isOpen) {
            closePanel();
            return;
          }

          setIsOpen(true);
          setStatusMessage(null);
        }}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--line)] bg-white/70 text-[var(--foreground)] shadow-sm hover:bg-white"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.08a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.08a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.08a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </button>

      {isOpen ? (
        <div className="absolute right-0 top-12 z-50 w-64 max-w-[calc(100vw-3rem)] rounded-[1.4rem] border border-[var(--line)] bg-[var(--surface-strong)] p-4 shadow-[var(--shadow)]">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-[var(--foreground)]">Hotkey</p>
            <p className="text-sm muted">
              Drücke direkt eine Kombination wie Ctrl+Alt+K oder eine der F-Tasten. Standard ist F9.
            </p>
          </div>

          <div className="mt-4 space-y-2">
            <label
              htmlFor="search-hotkey-capture"
              className="text-sm font-medium text-[var(--foreground)]"
            >
              Suchfeld fokussieren
            </label>
            <button
              id="search-hotkey-capture"
              ref={captureButtonRef}
              type="button"
              data-hotkey-capture="true"
              onClick={() => {
                setIsCapturing(true);
                setStatusMessage("Jetzt Tastenkombination drücken.");
              }}
              onBlur={() => setIsCapturing(false)}
              onKeyDown={handleCaptureKeyDown}
              className="input-ring flex w-full flex-col items-start rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-left"
            >
              <span className="text-sm font-semibold text-[var(--foreground)]">
                {isCapturing ? "Tastenkombination erfassen..." : hotkey}
              </span>
              <span className="mt-1 text-xs muted">
                {isCapturing
                  ? "Drücke jetzt die gewünschte Kombination. Esc bricht ab."
                  : "Klicken und danach die Tastenkombination drücken."}
              </span>
            </button>
            {statusMessage ? (
              <p className="text-xs font-medium text-[var(--accent-strong)]">
                {statusMessage}
              </p>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => {
              setIsCapturing(false);
              setStatusMessage(null);
              void updateHotkey(DEFAULT_SEARCH_HOTKEY);
            }}
            className="mt-4 text-sm font-medium text-[var(--accent-strong)] hover:opacity-80"
          >
            Auf Standard zurücksetzen
          </button>
        </div>
      ) : null}
    </div>
  );
}
