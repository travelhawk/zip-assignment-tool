import { redirect } from "next/navigation";
import { ElectronAuthComplete } from "@/components/electron-auth-complete";
import { getAppSession } from "@/lib/app-auth";
import { buildElectronProtocolUrl } from "@/lib/electron-auth";
import { completeElectronLoginRequest } from "@/lib/electron-login-requests";
import { authRuntime } from "@/lib/env";

type SearchParamValue = string | string[] | undefined;

type ElectronAuthCompletePageProps = {
  searchParams?: Promise<Record<string, SearchParamValue>>;
};

function readSingleParam(value: SearchParamValue) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default async function ElectronAuthCompletePage({
  searchParams,
}: ElectronAuthCompletePageProps) {
  if (authRuntime.method !== "entra") {
    redirect("/");
  }

  const params = searchParams ? await searchParams : {};
  const requestId = readSingleParam(params.request).trim();
  const session = await getAppSession();

  if (!session?.user) {
    redirect("/login");
  }

  if (requestId) {
    completeElectronLoginRequest(
      requestId,
      {
        email: session.user.email,
        isAdmin: session.user.isAdmin,
        name: session.user.name,
      },
      authRuntime.authSecret,
    );
  }

  return (
    <ElectronAuthComplete
      protocolUrl={requestId ? buildElectronProtocolUrl(requestId) : null}
    />
  );
}
