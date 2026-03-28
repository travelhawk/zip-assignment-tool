import { NextResponse } from "next/server";
import { getAppSession } from "@/lib/app-auth";
import { recordPageView } from "@/lib/analytics";
import { getDatabase } from "@/lib/db";

type TrackRequestPayload = {
  pathname?: unknown;
};

function normalizePathname(value: unknown) {
  if (typeof value !== "string") {
    return "/";
  }

  const trimmedValue = value.trim();
  return trimmedValue.startsWith("/") ? trimmedValue : "/";
}

export async function POST(request: Request) {
  const session = await getAppSession();

  if (!session?.user) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  let payload: TrackRequestPayload | null = null;

  try {
    payload = (await request.json()) as TrackRequestPayload;
  } catch {
    payload = null;
  }

  recordPageView(session.user, normalizePathname(payload?.pathname), getDatabase());
  return new NextResponse(null, { status: 204 });
}
