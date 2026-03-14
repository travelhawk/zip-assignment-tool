"use client";

import { useEffect } from "react";

type ElectronAuthCompleteProps = {
  protocolUrl: string;
};

export function ElectronAuthComplete({ protocolUrl }: ElectronAuthCompleteProps) {
  useEffect(() => {
    window.location.replace(protocolUrl);
  }, [protocolUrl]);

  return (
    <main className="app-shell flex items-center justify-center px-6 py-12">
      <div className="glass-card w-full max-w-xl rounded-[2rem] px-8 py-10 md:px-10 md:py-12">
        <section className="space-y-6">
          <div className="space-y-3">
            <p className="kicker text-sm muted">Desktop-Anmeldung</p>
            <h1 className="heading-font text-4xl font-semibold leading-tight">
              Zur App zurückkehren
            </h1>
            <p className="muted text-base leading-7">
              Die Anmeldung war erfolgreich. Falls die Desktop-App nicht automatisch öffnet,
              verwende den Button unten.
            </p>
          </div>

          <a
            href={protocolUrl}
            className="inline-flex w-full items-center justify-center rounded-2xl bg-[var(--accent)] px-5 py-4 text-base font-semibold text-white shadow-sm hover:bg-[var(--accent-strong)]"
          >
            Desktop-App öffnen
          </a>
        </section>
      </div>
    </main>
  );
}
