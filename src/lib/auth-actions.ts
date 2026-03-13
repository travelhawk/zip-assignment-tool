"use server";

import { signIn, signOut } from "@/auth";
import { authRuntime } from "@/lib/env";

export async function loginWithMicrosoft() {
  if (authRuntime.method !== "entra" || !authRuntime.isReady) {
    return;
  }

  await signIn("microsoft-entra-id", { redirectTo: "/" });
}

export async function logout() {
  if (authRuntime.method === "basic") {
    return;
  }

  await signOut({ redirectTo: "/login" });
}
