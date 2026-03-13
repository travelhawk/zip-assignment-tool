import Link from "next/link";
import { SearchInput } from "@/components/search-input";
import { getAppSession } from "@/lib/app-auth";
import { getDashboardOverview, searchAssignments } from "@/lib/repository";

type SearchParamValue = string | string[] | undefined;

type DashboardPageProps = {
  searchParams?: Promise<Record<string, SearchParamValue>>;
};

function readSingleParam(value: SearchParamValue) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function formatTimestamp(value: string | null) {
  if (!value) {
    return "Noch kein Import";
  }

  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatLocationText(
  localities: string[],
  secondaryAreas: string[],
  adminAreas: string[],
) {
  let locationLabel = "Kein Ort gefunden";

  if (localities.length === 1) {
    locationLabel = localities[0];
  } else if (localities.length === 2) {
    locationLabel = localities.join(", ");
  } else if (localities.length > 2) {
    locationLabel = secondaryAreas[0]
      ? `Mehrere Orte im Raum ${secondaryAreas[0]}`
      : `Mehrere Orte (${localities.length})`;
  }

  if (!adminAreas.length) {
    return locationLabel;
  }

  return `${locationLabel} | ${adminAreas[0]}`;
}

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const session = await getAppSession();
  const params = searchParams ? await searchParams : {};
  const query = readSingleParam(params.q).trim();
  const overview = getDashboardOverview();
  const search = query ? searchAssignments(query) : null;
  const isAdmin = Boolean(session?.user?.isAdmin);

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6">
      <section className="glass-card rounded-[2rem] p-6 md:p-8">
        <div className="space-y-6">
          <h1 className="heading-font text-3xl font-semibold md:text-4xl">Person suchen</h1>

          <SearchInput defaultValue={query} />

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm leading-6 muted">
            <span>{overview.assignmentCount} Zuordnungen</span>
            <span aria-hidden="true">|</span>
            <span>Letzter Import {formatTimestamp(overview.lastImport?.importedAt ?? null)}</span>
          </div>

          {overview.assignmentCount === 0 ? (
            <div className="rounded-3xl border border-dashed border-[var(--line)] bg-white/40 p-6">
              <h2 className="heading-font text-xl font-semibold">Noch keine Daten</h2>
              <p className="mt-2 text-sm leading-6 muted">
                Es wurde noch keine Datei importiert.
              </p>
              {isAdmin ? (
                <div className="mt-5">
                  <Link
                    href="/admin"
                    className="inline-flex items-center justify-center rounded-2xl bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[var(--accent-strong)]"
                  >
                    Jetzt importieren
                  </Link>
                </div>
              ) : (
                <p className="mt-4 text-sm leading-6 muted">
                  Bitte wende dich an eine Admin-Person, damit die Zuordnungen importiert werden.
                </p>
              )}
            </div>
          ) : query ? (
            <div className="space-y-4">
              <h2 className="heading-font text-2xl font-semibold">
                {search?.results.length ?? 0} Treffer
              </h2>

              {search?.results.length ? (
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
              ) : (
                <div className="rounded-3xl border border-dashed border-[var(--line)] bg-white/40 p-6">
                  <h2 className="heading-font text-xl font-semibold">Keine Treffer</h2>
                  <p className="mt-2 text-sm leading-6 muted">
                    Versuche eine ganze PLZ oder einen Ortsnamen.
                  </p>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
