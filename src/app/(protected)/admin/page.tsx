import { getAppSession } from "@/lib/app-auth";
import { getDashboardOverview } from "@/lib/repository";

type SearchParamValue = string | string[] | undefined;

type AdminPageProps = {
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

function renderStatus(
  status: string,
  count: string,
  deduped: string,
  error: string,
  sheet: string,
) {
  if (status === "success") {
    return (
      <div className="status-ok rounded-3xl px-5 py-4 text-sm font-medium">
        {count} Zeilen erfolgreich importiert.
        {deduped !== "0" ? ` Doppelte PLZ zusammengeführt: ${deduped}.` : ""}
        {sheet ? ` Blatt: ${sheet}.` : ""}
      </div>
    );
  }

  if (status === "forbidden") {
    return (
      <div className="status-error rounded-3xl px-5 py-4 text-sm font-medium">
        Dieses Konto hat keine Admin-Berechtigung.
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="status-error rounded-3xl px-5 py-4 text-sm font-medium">
        {error || "Der Import ist fehlgeschlagen."}
      </div>
    );
  }

  return null;
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const session = await getAppSession();
  const params = searchParams ? await searchParams : {};
  const status = readSingleParam(params.status);
  const count = readSingleParam(params.count);
  const deduped = readSingleParam(params.deduped);
  const error = readSingleParam(params.error);
  const sheet = readSingleParam(params.sheet);
  const overview = getDashboardOverview();

  if (!session?.user?.isAdmin) {
    return (
      <main className="glass-card rounded-[2rem] p-6 md:p-8">
        {renderStatus(status || "forbidden", count, deduped, error, sheet)}
        <div className="mt-6 max-w-2xl space-y-3">
          <p className="kicker text-xs muted">Admin</p>
          <h2 className="heading-font text-3xl font-semibold">Kein Zugriff</h2>
          <p className="text-base leading-7 muted">Diese Seite ist nur für Admins.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <section className="glass-card rounded-[2rem] p-6 md:p-8">
        <div className="space-y-6">
          <div className="space-y-3">
            <p className="kicker text-xs muted">Import</p>
            <h2 className="heading-font text-3xl font-semibold">
              Excel-Datei importieren
            </h2>
            <p className="max-w-2xl text-base leading-7 muted">
              Datei mit zwei Spalten hochladen:
              <span className="mx-2 font-mono text-sm text-[var(--foreground)]">PLZ</span> und
              <span className="mx-2 font-mono text-sm text-[var(--foreground)]">
                zuständige Person
              </span>
              . Kopfzeile ist erlaubt.
            </p>
          </div>

          {renderStatus(status, count, deduped, error, sheet)}

          <form
            action="/api/admin/import"
            method="post"
            encType="multipart/form-data"
            className="space-y-5 rounded-[2rem] border border-[var(--line)] bg-[var(--surface-strong)] p-6"
          >
            <div className="space-y-2">
              <label
                htmlFor="assignment-file"
                className="text-sm font-semibold text-[var(--foreground)]"
              >
                Excel-Datei
              </label>
              <input
                id="assignment-file"
                name="file"
                type="file"
                accept=".xlsx,.xlsm"
                className="input-ring block w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-sm"
                required
              />
            </div>

            <div className="rounded-3xl border border-[var(--line)] bg-white/70 px-4 py-4 text-sm leading-6 muted">
              Achtung: Der Import ersetzt bestehende Zuordnungen!
            </div>

            <button
              type="submit"
              className="rounded-2xl bg-[var(--accent)] px-6 py-4 text-base font-semibold text-white shadow-sm hover:bg-[var(--accent-strong)]"
            >
              Import starten
            </button>
          </form>
        </div>
      </section>

      <aside className="grid gap-6">
        <section className="glass-card rounded-[2rem] p-6">
          <p className="kicker text-xs muted">Status</p>
          <div className="mt-4 grid gap-4">
            <div className="rounded-3xl border border-[var(--line)] bg-[var(--surface-strong)] p-5">
              <div className="text-4xl font-semibold">{overview.assignmentCount}</div>
              <div className="mt-2 text-sm muted">durchsuchbare Zeilen</div>
            </div>
            <div className="rounded-3xl border border-[var(--line)] bg-[var(--surface-strong)] p-5">
              <div className="text-sm font-semibold text-[var(--foreground)]">
                Letzter Import
              </div>
              {overview.lastImport ? (
                <div className="mt-3 space-y-1 text-sm leading-6 muted">
                  <p>{formatTimestamp(overview.lastImport.importedAt)}</p>
                  <p>
                    {overview.lastImport.recordCount} Zeilen
                    <span className="mx-2">|</span>
                    {overview.lastImport.fileName}
                  </p>
                  <p>Importiert von {overview.lastImport.importedBy}</p>
                </div>
              ) : (
                <p className="mt-3 text-sm leading-6 muted">Noch kein Import.</p>
              )}
            </div>
          </div>
        </section>
      </aside>
    </main>
  );
}
