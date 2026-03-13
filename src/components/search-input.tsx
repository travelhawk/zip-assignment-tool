"use client";

import { startTransition, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  HOTKEY_CHANGE_EVENT,
  matchesHotkeyEvent,
  readStoredHotkey,
} from "@/lib/hotkey-settings";

type SearchInputProps = {
  defaultValue: string;
};

export function SearchInput({ defaultValue }: SearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(defaultValue);
  const [hotkey, setHotkey] = useState(() => readStoredHotkey());

  useEffect(() => {
    setValue(defaultValue);
  }, [defaultValue]);

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

  useEffect(() => {
    const nextQuery = value.trim();
    const currentQuery = (searchParams.get("q") ?? "").trim();

    if (nextQuery === currentQuery) {
      return;
    }

    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());

      if (nextQuery) {
        params.set("q", nextQuery);
      } else {
        params.delete("q");
      }

      const target = params.size ? `${pathname}?${params.toString()}` : pathname;

      startTransition(() => {
        router.replace(target, { scroll: false });
      });
    }, 250);

    return () => window.clearTimeout(timer);
  }, [pathname, router, searchParams, value]);

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextQuery = value.trim();
    const params = new URLSearchParams(searchParams.toString());

    if (nextQuery) {
      params.set("q", nextQuery);
    } else {
      params.delete("q");
    }

    const target = params.size ? `${pathname}?${params.toString()}` : pathname;
    router.replace(target, { scroll: false });
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
          onChange={(event) => setValue(event.target.value)}
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
