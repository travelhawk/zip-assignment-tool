"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { signIn, signOut } from "@/auth";
import { ELECTRON_SESSION_COOKIE } from "@/lib/electron-auth";
import { authRuntime } from "@/lib/env";

export async function loginWithMicrosoft() {
  if (authRuntime.method !== "entra" || !authRuntime.isReady) {
    return;
  }

  await signIn("microsoft-entra-id", { redirectTo: "/" });
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete(ELECTRON_SESSION_COOKIE);

  if (authRuntime.method === "basic") {
    return;
  }

  if (!authRuntime.isReady) {
    redirect("/login");
  }

  await signOut({ redirectTo: "/login" });
}
