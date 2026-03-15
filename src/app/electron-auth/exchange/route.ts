import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  ELECTRON_SESSION_COOKIE,
  getElectronSessionCookieOptions,
} from "@/lib/electron-auth";
import { consumeElectronLoginRequest } from "@/lib/electron-login-requests";

export async function GET(request: NextRequest) {
  const requestId = request.nextUrl.searchParams.get("request")?.trim() ?? "";
  const sessionToken = consumeElectronLoginRequest(requestId);

  if (!sessionToken) {
    const targetUrl = new URL("/login?error=ElectronLoginExpired", request.url);
    return NextResponse.redirect(targetUrl);
  }

  const response = NextResponse.redirect(new URL("/", request.url));
  response.cookies.set(
    ELECTRON_SESSION_COOKIE,
    sessionToken,
    getElectronSessionCookieOptions(request.nextUrl.protocol === "https:"),
  );
  return response;
}
