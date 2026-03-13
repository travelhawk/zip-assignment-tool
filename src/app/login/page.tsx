import Link from "next/link";
import { redirect } from "next/navigation";
import { getAppSession } from "@/lib/app-auth";
import { loginWithMicrosoft } from "@/lib/auth-actions";
import { appRuntime, authRuntime } from "@/lib/env";

type SearchParamValue = string | string[] | undefined;

type LoginPageProps = {
  searchParams?: Promise<Record<string, SearchParamValue>>;
};

function readSingleParam(value: SearchParamValue) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function looksLikeGuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value.trim(),
  );
}

function renderAuthError(error: string) {
  if (!error) {
    return null;
  }

  if (error === "OAuthCallbackError") {
    const secretLooksWrong = looksLikeGuid(authRuntime.clientSecret);

    return (
      <div className="danger-card rounded-3xl border p-5">
        <h2 className="heading-font text-xl font-semibold">Anmeldung fehlgeschlagen</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--danger)]">
          Die Anmeldung ist derzeit nicht möglich. Bitte versuche es erneut.
        </p>
        <details className="mt-4 rounded-2xl border border-[var(--line)] bg-white/70 p-4 text-sm leading-6">
          <summary className="cursor-pointer font-medium text-[var(--foreground)]">
            Technische Hinweise
          </summary>
          <div className="mt-3 space-y-2 text-[var(--foreground)]">
            <p>
              Redirect-URI:
              <span className="ml-2 font-mono text-xs">
                http://localhost:3000/api/auth/callback/microsoft-entra-id
              </span>
            </p>
            <p>
              Prüfe
              <span className="mx-2 font-mono text-xs">AUTH_MICROSOFT_ENTRA_ID_SECRET</span>
              in der Env-Datei.
              {secretLooksWrong
                ? " Der aktuelle Wert sieht wie eine GUID aus. Hier wird normalerweise der Secret Value benötigt, nicht die Secret ID."
                : " Hier muss der Secret Value aus Entra stehen."}
            </p>
          </div>
        </details>
      </div>
    );
  }

  return (
    <div className="danger-card rounded-3xl border p-5">
      <h2 className="heading-font text-xl font-semibold">Anmeldung fehlgeschlagen</h2>
      <p className="mt-2 text-sm leading-6 text-[var(--danger)]">
        Die Anmeldung konnte nicht abgeschlossen werden.
      </p>
    </div>
  );
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await getAppSession();
  const params = searchParams ? await searchParams : {};
  const error = readSingleParam(params.error).trim();

  if (session?.user) {
    redirect("/");
  }

  return (
    <main className="app-shell flex items-center justify-center px-6 py-12">
      <div className="glass-card w-full max-w-xl rounded-[2rem] px-8 py-10 md:px-10 md:py-12">
        <section className="space-y-6">
          <div className="space-y-3">
            <p className="kicker text-sm muted">{appRuntime.displayName}</p>
            <h1 className="heading-font text-4xl font-semibold leading-tight">Anmelden</h1>
            <p className="muted text-base leading-7">
              Melde dich an, um PLZ und Orte schnell nachzuschlagen.
            </p>
          </div>

          {renderAuthError(error)}

          {authRuntime.isReady ? (
            authRuntime.method === "basic" ? (
              <Link
                href="/"
                className="inline-flex w-full items-center justify-center rounded-2xl bg-[var(--accent)] px-5 py-4 text-base font-semibold text-white shadow-sm hover:bg-[var(--accent-strong)]"
              >
                Anmelden
              </Link>
            ) : (
              <form action={loginWithMicrosoft}>
                <button
                  type="submit"
                  className="w-full rounded-2xl bg-[var(--accent)] px-5 py-4 text-base font-semibold text-white shadow-sm hover:bg-[var(--accent-strong)]"
                >
                  Anmelden
                </button>
              </form>
            )
          ) : (
            <div className="danger-card rounded-3xl border p-5">
              <h2 className="heading-font text-xl font-semibold">Konfiguration fehlt</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--danger)]">
                Diese Variablen fehlen noch:
              </p>
              <ul className="mt-4 space-y-2 font-mono text-sm text-[var(--foreground)]">
                {authRuntime.missingAuthEnvVars.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
