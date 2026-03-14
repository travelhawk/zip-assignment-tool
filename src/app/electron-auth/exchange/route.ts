import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  consumeElectronHandoff,
  createElectronSessionToken,
  ELECTRON_SESSION_COOKIE,
  getElectronSessionCookieOptions,
} from "@/lib/electron-auth";
import { authRuntime } from "@/lib/env";

export async function GET(request: NextRequest) {
  const handoff = request.nextUrl.searchParams.get("handoff")?.trim() ?? "";
  const user = consumeElectronHandoff(handoff);

  if (!user) {
    const targetUrl = new URL("/login?error=ElectronLoginExpired", request.url);
    return NextResponse.redirect(targetUrl);
  }

  const response = NextResponse.redirect(new URL("/", request.url));
  response.cookies.set(
    ELECTRON_SESSION_COOKIE,
    createElectronSessionToken(user, authRuntime.authSecret),
    getElectronSessionCookieOptions(request.nextUrl.protocol === "https:"),
  );
  return response;
}
