import { requireAppSession } from "@/lib/app-auth";
import { AppNav } from "@/components/app-nav";
import { AnalyticsTracker } from "@/components/analytics-tracker";
import { SearchSettings } from "@/components/search-settings";
import { logout } from "@/lib/auth-actions";
import { appRuntime } from "@/lib/env";

export default async function ProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await requireAppSession();

  return (
    <div className="app-shell px-5 py-5 md:px-8 md:py-8">
      <AnalyticsTracker />
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <header className="glass-card relative z-30 overflow-visible rounded-[2rem] px-6 py-4 md:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <p className="kicker text-xs muted">{appRuntime.displayName}</p>
              <div className="flex flex-wrap items-center gap-2 text-sm muted">
                <p>
                  Angemeldet als{" "}
                  <span className="font-medium text-[var(--foreground)]">
                    {session.user.email ?? "Unbekannt"}
                  </span>
                </p>
                {session.user.isSuperAdmin ? (
                  <span className="rounded-full border border-[var(--line)] bg-white/75 px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--foreground)]">
                    SuperAdmin
                  </span>
                ) : session.user.isAdmin ? (
                  <span className="rounded-full border border-[var(--line)] bg-white/75 px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--foreground)]">
                    Admin
                  </span>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <SearchSettings />
              <AppNav
                isAdmin={session.user.isAdmin}
                isSuperAdmin={session.user.isSuperAdmin}
              />
              {session.user.authMethod === "entra" ? (
                <form action={logout}>
                  <button
                    type="submit"
                    className="rounded-full bg-[var(--foreground)] px-4 py-2 text-sm font-medium text-white hover:opacity-92"
                  >
                    Abmelden
                  </button>
                </form>
              ) : null}
            </div>
          </div>
        </header>

        {children}
      </div>
    </div>
  );
}
