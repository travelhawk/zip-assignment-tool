import { NextResponse } from "next/server";
import { getAppSession } from "@/lib/app-auth";
import { recordSearch } from "@/lib/analytics";
import { getDatabase } from "@/lib/db";
import { searchAssignments } from "@/lib/repository";
import { normalizeSearchQuery } from "@/lib/search-url-state";

export async function GET(request: Request) {
  const session = await getAppSession();

  if (!session?.user) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const query = normalizeSearchQuery(new URL(request.url).searchParams.get("q"));

  if (!query) {
    return NextResponse.json({ error: "Bitte einen Suchbegriff angeben." }, { status: 400 });
  }

  recordSearch(session.user, getDatabase());

  return NextResponse.json(searchAssignments(query), {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
