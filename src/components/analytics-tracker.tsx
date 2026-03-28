"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const DUPLICATE_WINDOW_MS = 1000;
const TRACKER_CACHE_KEY = "plz-analytics:last-page-view";

type CachedPageView = {
  occurredAt: number;
  pathname: string;
};

function readCachedPageView() {
  try {
    const value = window.sessionStorage.getItem(TRACKER_CACHE_KEY);

    if (!value) {
      return null;
    }

    return JSON.parse(value) as CachedPageView;
  } catch {
    return null;
  }
}

function writeCachedPageView(pathname: string, occurredAt: number) {
  try {
    window.sessionStorage.setItem(
      TRACKER_CACHE_KEY,
      JSON.stringify({ pathname, occurredAt } satisfies CachedPageView),
    );
  } catch {}
}

export function AnalyticsTracker() {
  const pathname = usePathname();

  useEffect(() => {
    const occurredAt = Date.now();
    const cachedPageView = readCachedPageView();

    if (
      cachedPageView?.pathname === pathname &&
      occurredAt - cachedPageView.occurredAt < DUPLICATE_WINDOW_MS
    ) {
      return;
    }

    writeCachedPageView(pathname, occurredAt);

    void fetch("/api/analytics/track", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ pathname }),
      cache: "no-store",
      keepalive: true,
    }).catch(() => {});
  }, [pathname]);

  return null;
}
