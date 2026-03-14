import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import {
  isValidBasicCredentials,
  parseBasicAuthorizationHeader,
} from "@/lib/basic-auth";
import {
  ELECTRON_SESSION_COOKIE,
  readElectronSessionToken,
} from "@/lib/electron-auth";
import { authRuntime } from "@/lib/env";

export type AppSession = {
  user: {
    email: string | null;
    isAdmin: boolean;
    name: string | null;
    authMethod: "entra" | "basic";
  };
};

export async function getAppSession() {
  if (authRuntime.method === "basic") {
    if (!authRuntime.isReady) {
      return null;
    }

    const requestHeaders = await headers();
    const credentials = parseBasicAuthorizationHeader(
      requestHeaders.get("authorization"),
    );

    if (!isValidBasicCredentials(credentials)) {
      return null;
    }

    return {
      user: {
        email: authRuntime.basicAuth.email,
        isAdmin: true,
        name: authRuntime.basicAuth.displayName,
        authMethod: "basic",
      },
    } satisfies AppSession;
  }

  const cookieStore = await cookies();
  const electronSession = readElectronSessionToken(
    cookieStore.get(ELECTRON_SESSION_COOKIE)?.value,
    authRuntime.authSecret,
  );

  if (electronSession) {
    return {
      user: electronSession,
    } satisfies AppSession;
  }

  const session = await auth();

  if (!session?.user) {
    return null;
  }

  return {
    user: {
      email: session.user.email ?? null,
      isAdmin: session.user.isAdmin,
      name: session.user.name ?? null,
      authMethod: "entra",
    },
  } satisfies AppSession;
}

export async function requireAppSession() {
  const session = await getAppSession();

  if (!session) {
    redirect("/login");
  }

  return session;
}
