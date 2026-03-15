import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { signIn } from "@/auth";
import { authRuntime } from "@/lib/env";

export async function GET(request: NextRequest) {
  if (authRuntime.method !== "entra" || !authRuntime.isReady) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const requestId = request.nextUrl.searchParams.get("request")?.trim() ?? "";
  const redirectTarget = new URL("/electron-auth/complete", request.url);

  if (requestId) {
    redirectTarget.searchParams.set("request", requestId);
  }

  const targetUrl = await signIn("microsoft-entra-id", {
    redirect: false,
    redirectTo: redirectTarget.toString(),
  });

  return NextResponse.redirect(targetUrl);
}
