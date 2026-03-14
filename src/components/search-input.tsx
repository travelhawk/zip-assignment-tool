"use client";

import { startTransition, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  HOTKEY_CHANGE_EVENT,
  matchesHotkeyEvent,
  readStoredHotkey,
} from "@/lib/hotkey-settings";
import { shouldSyncSearchValueFromUrl } from "@/lib/search-query-sync";

type SearchInputProps = {
  defaultValue: string;
};

export function SearchInput({ defaultValue }: SearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<number | null>(null);
  const localValueRef = useRef(defaultValue);
  const lastRequestedQueryRef = useRef(defaultValue);
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [hotkey, setHotkey] = useState(() => readStoredHotkey());

  useEffect(() => {
    if (
      !shouldSyncSearchValueFromUrl({
        localValue: localValueRef.current,
        requestedQuery: lastRequestedQueryRef.current,
        urlQuery: defaultValue,
      })
    ) {
      return;
    }

    localValueRef.current = defaultValue;
    lastRequestedQueryRef.current = defaultValue;

    if (inputRef.current && inputRef.current.value !== defaultValue) {
      inputRef.current.value = defaultValue;
    }
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
    return () => {
      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  function replaceSearch(nextQuery: string) {
    const params = new URLSearchParams(searchParams.toString());

    if (nextQuery) {
      params.set("q", nextQuery);
    } else {
      params.delete("q");
    }

    const target = params.size ? `${pathname}?${params.toString()}` : pathname;
    lastRequestedQueryRef.current = nextQuery;

    startTransition(() => {
      router.replace(target, { scroll: false });
    });
  }

  function handleSearchChange(nextValue: string) {
    localValueRef.current = nextValue;

    if (debounceTimerRef.current !== null) {
      window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    const nextQuery = nextValue.trim();
    const currentQuery = (searchParams.get("q") ?? "").trim();

    if (nextQuery === currentQuery) {
      return;
    }

    debounceTimerRef.current = window.setTimeout(() => {
      replaceSearch(nextQuery);
      debounceTimerRef.current = null;
    }, 250);
  }

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (debounceTimerRef.current !== null) {
      window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    const nextValue = inputRef.current?.value ?? localValueRef.current;
    localValueRef.current = nextValue;
    replaceSearch(nextValue.trim());
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
          defaultValue={defaultValue}
          onChange={(event) => handleSearchChange(event.target.value)}
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
