import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { signIn } from "@/auth";
import { authRuntime } from "@/lib/env";

export async function GET(request: NextRequest) {
  if (authRuntime.method !== "entra" || !authRuntime.isReady) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const targetUrl = await signIn("microsoft-entra-id", {
    redirect: false,
    redirectTo: "/electron-auth/complete",
  });

  return NextResponse.redirect(targetUrl);
}
