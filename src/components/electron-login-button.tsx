"use client";

import { useRef, useState, useSyncExternalStore } from "react";

const POLL_INTERVAL_MS = 1000;
const POLL_TIMEOUT_MS = 1000 * 60 * 5;

type ElectronLoginRequestPayload = {
  requestId: string;
};

type ElectronLoginPollPayload = {
  status: "complete" | "expired" | "pending";
};

function subscribe(callback: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const frameId = window.requestAnimationFrame(() => {
    callback();
  });

  return () => {
    window.cancelAnimationFrame(frameId);
  };
}

function getClientSnapshot() {
  return Boolean(window.electronDesktop);
}

function getServerSnapshot() {
  return false;
}

async function readJson<T>(input: RequestInfo | URL) {
  const response = await fetch(input, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Die Desktop-Anmeldung konnte nicht gestartet werden.");
  }

  return (await response.json()) as T;
}

function buildElectronStartUrl(requestId: string) {
  const startUrl = new URL("/electron-auth/start", window.location.origin);
  startUrl.searchParams.set("request", requestId);
  return startUrl.toString();
}

function buildElectronPollUrl(requestId: string) {
  const pollUrl = new URL("/electron-auth/poll", window.location.origin);
  pollUrl.searchParams.set("request", requestId);
  return pollUrl.toString();
}

export function ElectronLoginButton() {
  const isDesktop = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const pollAbortRef = useRef<AbortController | null>(null);

  if (!isDesktop) {
    return null;
  }

  async function waitForCompletion(requestId: string) {
    const controller = new AbortController();
    pollAbortRef.current?.abort();
    pollAbortRef.current = controller;
    const deadline = Date.now() + POLL_TIMEOUT_MS;

    while (!controller.signal.aborted && Date.now() < deadline) {
      const payload = await readJson<ElectronLoginPollPayload>(
        buildElectronPollUrl(requestId),
      );

      if (payload.status === "complete") {
        window.location.assign(
          `/electron-auth/exchange?request=${encodeURIComponent(requestId)}`,
        );
        return;
      }

      if (payload.status === "expired") {
        throw new Error(
          "Die Browser-Anmeldung ist abgelaufen. Bitte starte den Vorgang erneut.",
        );
      }

      await new Promise((resolve) => window.setTimeout(resolve, POLL_INTERVAL_MS));
    }

    throw new Error("Die Browser-Anmeldung wurde nicht rechtzeitig abgeschlossen.");
  }

  async function handleClick() {
    try {
      setErrorMessage(null);
      setIsPending(true);
      const payload = await readJson<ElectronLoginRequestPayload>("/electron-auth/request");
      await window.electronDesktop?.startMicrosoftLogin(
        buildElectronStartUrl(payload.requestId),
      );
      await waitForCompletion(payload.requestId);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Der Browser konnte nicht geoeffnet werden.",
      );
      setIsPending(false);
      pollAbortRef.current?.abort();
      pollAbortRef.current = null;
    }
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="w-full rounded-2xl border border-[var(--line)] bg-white/80 px-5 py-4 text-base font-semibold text-[var(--foreground)] shadow-sm hover:bg-white disabled:cursor-wait disabled:opacity-70"
      >
        {isPending ? "Browser-Anmeldung laeuft..." : "Im Browser anmelden"}
      </button>
      <p className="text-sm leading-6 muted">
        Die Microsoft-Anmeldung oeffnet den Standardbrowser. Danach uebernimmt die
        Desktop-App den Login automatisch.
      </p>
      {errorMessage ? (
        <p className="text-sm leading-6 text-[var(--danger)]">{errorMessage}</p>
      ) : null}
    </div>
  );
}
