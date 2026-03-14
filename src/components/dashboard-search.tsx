"use client";

import { useEffect, useEffectEvent, useRef, useState, type ReactNode } from "react";
import { SearchInput } from "@/components/search-input";
import { formatLocationText } from "@/lib/search-display";
import type { SearchResponse } from "@/lib/search-types";
import {
  buildSearchApiPath,
  buildSearchLocation,
  normalizeSearchQuery,
  readSearchQueryFromUrl,
} from "@/lib/search-url-state";

const SEARCH_DEBOUNCE_MS = 100;
const URL_DEBOUNCE_MS = 300;

type DashboardSearchProps = {
  initialQuery: string;
  initialSearch: SearchResponse | null;
  searchEnabled: boolean;
  children?: ReactNode;
};

function currentLocationPath() {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

export function DashboardSearch({
  initialQuery,
  initialSearch,
  searchEnabled,
  children,
}: DashboardSearchProps) {
  const [query, setQuery] = useState(initialQuery);
  const [search, setSearch] = useState(initialSearch);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const searchTimerRef = useRef<number | null>(null);
  const urlTimerRef = useRef<number | null>(null);
  const activeControllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);

  function clearSearchTimer() {
    if (searchTimerRef.current !== null) {
      window.clearTimeout(searchTimerRef.current);
      searchTimerRef.current = null;
    }
  }

  function clearUrlTimer() {
    if (urlTimerRef.current !== null) {
      window.clearTimeout(urlTimerRef.current);
      urlTimerRef.current = null;
    }
  }

  function clearActiveRequest() {
    activeControllerRef.current?.abort();
    activeControllerRef.current = null;
  }

  function syncUrl(queryValue: string) {
    const nextLocation = buildSearchLocation(window.location.href, queryValue);

    if (nextLocation === currentLocationPath()) {
      return;
    }

    window.history.replaceState(window.history.state, "", nextLocation);
  }

  async function executeSearch(queryValue: string) {
    const normalizedQuery = normalizeSearchQuery(queryValue);

    clearActiveRequest();

    if (!searchEnabled || !normalizedQuery) {
      setIsLoading(false);
      setErrorMessage(null);
      setSearch(null);
      return;
    }

    const controller = new AbortController();
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    activeControllerRef.current = controller;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch(buildSearchApiPath(normalizedQuery), {
        signal: controller.signal,
        headers: {
          Accept: "application/json",
        },
        cache: "no-store",
      });

      if (response.status === 401) {
        window.location.assign("/login");
        return;
      }

      if (!response.ok) {
        const payload =
          response.headers.get("content-type")?.includes("application/json")
            ? ((await response.json()) as { error?: string })
            : null;

        throw new Error(payload?.error || "Die Suche konnte nicht geladen werden.");
      }

      const nextSearch = (await response.json()) as SearchResponse;

      if (requestId !== requestIdRef.current) {
        return;
      }

      setSearch(nextSearch);
      setErrorMessage(null);
    } catch (error) {
      if (controller.signal.aborted || requestId !== requestIdRef.current) {
        return;
      }

      setErrorMessage(
        error instanceof Error ? error.message : "Die Suche konnte nicht geladen werden.",
      );
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }

      if (activeControllerRef.current === controller) {
        activeControllerRef.current = null;
      }
    }
  }

  function scheduleSearch(queryValue: string) {
    clearSearchTimer();

    const normalizedQuery = normalizeSearchQuery(queryValue);

    if (!searchEnabled || !normalizedQuery) {
      clearActiveRequest();
      setIsLoading(false);
      setErrorMessage(null);
      setSearch(null);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    searchTimerRef.current = window.setTimeout(() => {
      searchTimerRef.current = null;
      void executeSearch(normalizedQuery);
    }, SEARCH_DEBOUNCE_MS);
  }

  function scheduleUrlSync(queryValue: string) {
    clearUrlTimer();

    urlTimerRef.current = window.setTimeout(() => {
      urlTimerRef.current = null;
      syncUrl(queryValue);
    }, URL_DEBOUNCE_MS);
  }

  function handleQueryChange(nextValue: string) {
    setQuery(nextValue);
    scheduleSearch(nextValue);
    scheduleUrlSync(nextValue);
  }

  function handleSubmit() {
    clearSearchTimer();
    clearUrlTimer();
    syncUrl(query);
    void executeSearch(query);
  }

  const handlePopState = useEffectEvent(() => {
    const nextQuery = readSearchQueryFromUrl(window.location.href);
    setQuery(nextQuery);
    clearSearchTimer();
    clearUrlTimer();

    if (!searchEnabled || !nextQuery) {
      clearActiveRequest();
      setIsLoading(false);
      setErrorMessage(null);
      setSearch(null);
      return;
    }

    void executeSearch(nextQuery);
  });

  useEffect(() => {
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      clearSearchTimer();
      clearUrlTimer();
      clearActiveRequest();
    };
  }, []);

  const hasQuery = Boolean(normalizeSearchQuery(query));

  return (
    <div className="space-y-6">
      <SearchInput value={query} onValueChange={handleQueryChange} onSubmit={handleSubmit} />
      {children}

      {searchEnabled && hasQuery ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="heading-font text-2xl font-semibold">
              {search?.results.length ?? 0} Treffer
            </h2>
            {isLoading ? (
              <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-medium text-[var(--accent-strong)]">
                Suche läuft...
              </span>
            ) : null}
          </div>

          {errorMessage ? (
            <div className="rounded-3xl border border-dashed border-[var(--line)] bg-white/40 p-6">
              <h2 className="heading-font text-xl font-semibold">Suche nicht verfügbar</h2>
              <p className="mt-2 text-sm leading-6 muted">{errorMessage}</p>
            </div>
          ) : search?.results.length ? (
            <div className="grid gap-4">
              {search.results.map((result) => (
                <article
                  key={`${result.postalCode}-${result.assigneeName}`}
                  className="rounded-3xl border border-[var(--line)] bg-[var(--surface-strong)] p-5"
                >
                  <div className="flex flex-col gap-3">
                    <p className="text-sm font-medium uppercase tracking-[0.16em] text-[var(--accent-strong)]">
                      {result.postalCode}
                    </p>
                    <h3 className="text-2xl font-semibold">{result.assigneeName}</h3>
                    <p className="text-sm leading-6 muted">
                      {formatLocationText(
                        result.localities,
                        result.secondaryAreas,
                        result.adminAreas,
                      )}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          ) : !isLoading ? (
            <div className="rounded-3xl border border-dashed border-[var(--line)] bg-white/40 p-6">
              <h2 className="heading-font text-xl font-semibold">Keine Treffer</h2>
              <p className="mt-2 text-sm leading-6 muted">
                Versuche eine ganze PLZ oder einen Ortsnamen.
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
