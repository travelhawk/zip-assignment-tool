import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  createBasicAuthChallengeHeaders,
  isValidBasicCredentials,
  parseBasicAuthorizationHeader,
} from "@/lib/basic-auth";

function isProtectedPath(pathname: string) {
  if (pathname.startsWith("/_next") || pathname === "/favicon.ico") {
    return false;
  }

  if (pathname.startsWith("/api/auth") || pathname === "/login") {
    return false;
  }

  return (
    pathname === "/" ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/analytics") ||
    pathname.startsWith("/api/admin") ||
    pathname.startsWith("/api/analytics")
  );
}

export function proxy(request: NextRequest) {
  if ((process.env.AUTH_METHOD ?? "entra").toLowerCase() !== "basic") {
    return NextResponse.next();
  }

  if (!process.env.BASIC_AUTH_PASSWORD || !isProtectedPath(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  const credentials = parseBasicAuthorizationHeader(
    request.headers.get("authorization"),
  );

  if (isValidBasicCredentials(credentials)) {
    return NextResponse.next();
  }

  return new NextResponse("Basic-Auth-Anmeldung erforderlich.", {
    status: 401,
    headers: createBasicAuthChallengeHeaders(),
  });
}

export const config = {
  matcher: ["/:path*"],
};
