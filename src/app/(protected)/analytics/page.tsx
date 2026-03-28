import { getAppSession } from "@/lib/app-auth";
import { getAnalyticsOverview } from "@/lib/analytics";
import { getDatabase } from "@/lib/db";

function formatTimestamp(value: string | null) {
  if (!value) {
    return "Noch nicht";
  }

  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatRoleLabel(isAdmin: boolean, isSuperAdmin: boolean) {
  if (isSuperAdmin) {
    return "SuperAdmin";
  }

  if (isAdmin) {
    return "Admin";
  }

  return "Nutzer";
}

function formatPathLabel(pathname: string) {
  if (pathname === "/") {
    return "Suche";
  }

  if (pathname === "/admin") {
    return "Import";
  }

  if (pathname === "/analytics") {
    return "Analytics";
  }

  return pathname;
}

export default async function AnalyticsPage() {
  const session = await getAppSession();

  if (!session?.user?.isSuperAdmin) {
    return (
      <main className="glass-card rounded-[2rem] p-6 md:p-8">
        <div className="max-w-2xl space-y-3">
          <p className="kicker text-xs muted">Analytics</p>
          <h2 className="heading-font text-3xl font-semibold">Kein Zugriff</h2>
          <p className="text-base leading-7 muted">
            Diese Seite ist nur für SuperAdmins.
          </p>
        </div>
      </main>
    );
  }

  const analytics = getAnalyticsOverview(getDatabase());
  const metricCards = [
    { label: "Nutzer gesamt", value: analytics.totalUsers },
    { label: "Aktiv in 30 Tagen", value: analytics.activeUsers30d },
    { label: "Aktiv in 7 Tagen", value: analytics.activeUsers7d },
    { label: "Seitenaufrufe", value: analytics.totalPageViews },
    { label: "Suchen", value: analytics.totalSearches },
    { label: "Importe", value: analytics.totalImports },
  ];

  return (
    <main className="grid gap-6">
      <section className="glass-card rounded-[2rem] p-6 md:p-8">
        <div className="space-y-3">
          <p className="kicker text-xs muted">Analytics</p>
          <h1 className="heading-font text-3xl font-semibold md:text-4xl">
            Nutzung im Blick behalten
          </h1>
          <p className="max-w-3xl text-base leading-7 muted">
            Diese Übersicht zeigt, wie viele Personen das Tool aktiv nutzen und
            welche Bereiche zuletzt verwendet wurden.
          </p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {metricCards.map((card) => (
            <article
              key={card.label}
              className="rounded-3xl border border-[var(--line)] bg-[var(--surface-strong)] p-5"
            >
              <div className="text-sm muted">{card.label}</div>
              <div className="mt-3 text-4xl font-semibold">{card.value}</div>
            </article>
          ))}
        </div>
      </section>

      <section className="glass-card rounded-[2rem] p-6 md:p-8">
        <div className="space-y-3">
          <p className="kicker text-xs muted">Letzte Aktivität</p>
          <h2 className="heading-font text-2xl font-semibold">Zuletzt aktive Nutzer</h2>
        </div>

        {analytics.recentUsers.length ? (
          <div className="mt-6 grid gap-4">
            {analytics.recentUsers.map((user) => (
              <article
                key={`${user.authMethod}-${user.email ?? user.displayName ?? user.lastSeenAt}`}
                className="rounded-3xl border border-[var(--line)] bg-[var(--surface-strong)] p-5"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold">
                        {user.displayName || user.email || "Unbekannter Nutzer"}
                      </h3>
                      <span className="rounded-full border border-[var(--line)] bg-white/70 px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--foreground)]">
                        {formatRoleLabel(user.isAdmin, user.isSuperAdmin)}
                      </span>
                    </div>
                    <p className="text-sm muted">
                      {user.email || "Keine E-Mail"} | {user.authMethod}
                    </p>
                    <p className="text-sm muted">
                      Erste Nutzung {formatTimestamp(user.firstSeenAt)}
                    </p>
                    <p className="text-sm muted">
                      Zuletzt aktiv {formatTimestamp(user.lastSeenAt)} in{" "}
                      {formatPathLabel(user.lastSeenPath)}
                    </p>
                  </div>

                  <div className="grid min-w-[220px] gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-[var(--line)] bg-white/70 px-4 py-3">
                      <div className="text-xs uppercase tracking-[0.12em] muted">
                        Aufrufe
                      </div>
                      <div className="mt-2 text-2xl font-semibold">{user.pageViewCount}</div>
                    </div>
                    <div className="rounded-2xl border border-[var(--line)] bg-white/70 px-4 py-3">
                      <div className="text-xs uppercase tracking-[0.12em] muted">Suchen</div>
                      <div className="mt-2 text-2xl font-semibold">{user.searchCount}</div>
                    </div>
                    <div className="rounded-2xl border border-[var(--line)] bg-white/70 px-4 py-3">
                      <div className="text-xs uppercase tracking-[0.12em] muted">Importe</div>
                      <div className="mt-2 text-2xl font-semibold">{user.importCount}</div>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-3xl border border-dashed border-[var(--line)] bg-white/40 p-6">
            <h3 className="heading-font text-xl font-semibold">Noch keine Nutzungsdaten</h3>
            <p className="mt-2 text-sm leading-6 muted">
              Sobald angemeldete Nutzer das Tool verwenden, erscheinen hier die
              ersten Kennzahlen.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
