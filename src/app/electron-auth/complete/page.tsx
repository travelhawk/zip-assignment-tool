import { redirect } from "next/navigation";
import { ElectronAuthComplete } from "@/components/electron-auth-complete";
import { getAppSession } from "@/lib/app-auth";
import { buildElectronProtocolUrl, createElectronHandoff } from "@/lib/electron-auth";
import { authRuntime } from "@/lib/env";

export default async function ElectronAuthCompletePage() {
  if (authRuntime.method !== "entra") {
    redirect("/");
  }

  const session = await getAppSession();

  if (!session?.user) {
    redirect("/login");
  }

  const handoff = createElectronHandoff({
    email: session.user.email,
    isAdmin: session.user.isAdmin,
    name: session.user.name,
  });

  return <ElectronAuthComplete protocolUrl={buildElectronProtocolUrl(handoff)} />;
}
