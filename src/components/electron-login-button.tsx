"use client";

import { useState, useSyncExternalStore } from "react";

function subscribe() {
  return () => {};
}

function getClientSnapshot() {
  return Boolean(window.electronDesktop);
}

function getServerSnapshot() {
  return false;
}

export function ElectronLoginButton() {
  const isDesktop = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isDesktop) {
    return null;
  }

  async function handleClick() {
    try {
      setErrorMessage(null);
      await window.electronDesktop?.startMicrosoftLogin();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Der Browser konnte nicht geöffnet werden.",
      );
    }
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handleClick}
        className="w-full rounded-2xl border border-[var(--line)] bg-white/80 px-5 py-4 text-base font-semibold text-[var(--foreground)] shadow-sm hover:bg-white"
      >
        Im Browser anmelden
      </button>
      <p className="text-sm leading-6 muted">
        Die Microsoft-Anmeldung öffnet den Standardbrowser und kehrt danach automatisch in
        die Desktop-App zurück.
      </p>
      {errorMessage ? (
        <p className="text-sm leading-6 text-[var(--danger)]">{errorMessage}</p>
      ) : null}
    </div>
  );
}
