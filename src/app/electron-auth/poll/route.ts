import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getElectronLoginRequestStatus } from "@/lib/electron-login-requests";

export async function GET(request: NextRequest) {
  const requestId = request.nextUrl.searchParams.get("request")?.trim() ?? "";

  return NextResponse.json({
    status: getElectronLoginRequestStatus(requestId),
  });
}
