import { NextResponse } from "next/server";
import { getAppSession } from "@/lib/app-auth";
import { replaceAssignmentsFromWorkbook } from "@/lib/repository";

function redirectWithMessage(
  requestUrl: string,
  status: "success" | "error" | "forbidden",
  params: Record<string, string>,
) {
  const url = new URL("/admin", requestUrl);
  url.searchParams.set("status", status);

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  return NextResponse.redirect(url, 303);
}

export async function POST(request: Request) {
  const session = await getAppSession();

  if (!session?.user) {
    return NextResponse.redirect(new URL("/login", request.url), 303);
  }

  if (!session.user.isAdmin) {
    return redirectWithMessage(request.url, "forbidden", {});
  }

  try {
    const importedBy =
      session.user.name?.trim() ||
      session.user.email?.trim() ||
      "Unbekannter Import";
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File) || file.size === 0) {
      return redirectWithMessage(request.url, "error", {
        error: "Bitte zuerst eine Excel-Datei auswählen.",
      });
    }

    const result = await replaceAssignmentsFromWorkbook(file, importedBy);

    return redirectWithMessage(request.url, "success", {
      count: String(result.insertedCount),
      deduped: String(result.deduplicatedCount),
      sheet: result.worksheetName,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Der Import ist unerwartet fehlgeschlagen.";

    return redirectWithMessage(request.url, "error", {
      error: message,
    });
  }
}
