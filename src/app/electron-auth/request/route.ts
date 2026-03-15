import { NextResponse } from "next/server";
import { createElectronLoginRequest } from "@/lib/electron-login-requests";
import { authRuntime } from "@/lib/env";

export async function GET() {
  if (authRuntime.method !== "entra" || !authRuntime.isReady) {
    return NextResponse.json({ error: "Electron login is not available." }, { status: 400 });
  }

  return NextResponse.json({
    requestId: createElectronLoginRequest(),
  });
}
