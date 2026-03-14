"use client";

import { useEffect, useRef, useState } from "react";
import {
  HOTKEY_CHANGE_EVENT,
  matchesHotkeyEvent,
  readStoredHotkey,
} from "@/lib/hotkey-settings";

type SearchInputProps = {
  value: string;
  onValueChange: (value: string) => void;
  onSubmit?: () => void;
};

export function SearchInput({ value, onValueChange, onSubmit }: SearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [hotkey, setHotkey] = useState(() => readStoredHotkey());

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      const target = event.target;

      if (event.defaultPrevented || event.repeat) {
        return;
      }

      if (target instanceof Element && target.closest("[data-hotkey-capture='true']")) {
        return;
      }

      if (!matchesHotkeyEvent(hotkey, event)) {
        return;
      }

      event.preventDefault();
      inputRef.current?.focus();
      inputRef.current?.select();
    };

    const handleHotkeyChange = (event: Event) => {
      const nextValue = event instanceof CustomEvent ? String(event.detail ?? "") : "";
      setHotkey(nextValue || readStoredHotkey());
    };

    window.addEventListener("keydown", handleKeydown);
    window.addEventListener(HOTKEY_CHANGE_EVENT, handleHotkeyChange);

    return () => {
      window.removeEventListener("keydown", handleKeydown);
      window.removeEventListener(HOTKEY_CHANGE_EVENT, handleHotkeyChange);
    };
  }, [hotkey]);

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit?.();
  }

  return (
    <form onSubmit={submitSearch}>
      <label className="sr-only" htmlFor="postal-search">
        PLZ oder Ort suchen
      </label>
      <div className="rounded-[2rem] border border-[var(--line)] bg-white/90 p-2 shadow-sm">
        <input
          ref={inputRef}
          id="postal-search"
          name="q"
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          data-search-input="true"
          autoComplete="off"
          autoFocus
          placeholder="PLZ oder Ort"
          className="input-ring w-full rounded-[1.4rem] bg-transparent px-4 py-4 text-lg placeholder:text-[var(--muted)]"
        />
      </div>
    </form>
  );
}
