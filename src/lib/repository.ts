import "server-only";
import ExcelJS from "exceljs";
import { getDatabase } from "@/lib/db";
import {
  looksLikePostalCode,
  normalizeImportedPostalCode,
  normalizeLocalityLoose,
  normalizeLocalityStrict,
  sanitizePostalCode,
} from "@/lib/normalization";

type SearchRow = {
  postalCode: string;
  assigneeName: string;
  locality: string | null;
  admin1: string | null;
  admin2: string | null;
};

type CountRow = {
  count: number;
};

type ImportHistoryRow = {
  fileName: string;
  recordCount: number;
  importedBy: string;
  importedAt: string;
};

export type SearchMode = "postal-exact" | "postal-prefix" | "city";

export type SearchResult = {
  postalCode: string;
  assigneeName: string;
  localities: string[];
  adminAreas: string[];
  secondaryAreas: string[];
};

export type SearchResponse = {
  mode: SearchMode;
  results: SearchResult[];
};

export type DashboardOverview = {
  assignmentCount: number;
  postalReferenceCount: number;
  lastImport: ImportHistoryRow | null;
};

type ParsedWorkbook = {
  records: Array<{
    postalCode: string;
    assigneeName: string;
  }>;
  deduplicatedCount: number;
  worksheetName: string;
};

const deCollator = new Intl.Collator("de", {
  sensitivity: "base",
  numeric: true,
});

function readCellText(cell: ExcelJS.Cell) {
  const { value } = cell;

  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value).trim();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "object") {
    if ("text" in value && typeof value.text === "string") {
      return value.text.trim();
    }

    if ("result" in value && value.result !== undefined && value.result !== null) {
      return String(value.result).trim();
    }

    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText
        .map((item) => ("text" in item && typeof item.text === "string" ? item.text : ""))
        .join("")
        .trim();
    }

    if ("hyperlink" in value && typeof value.hyperlink === "string") {
      return (
        ("text" in value && typeof value.text === "string" ? value.text : value.hyperlink) ?? ""
      )
        .toString()
        .trim();
    }
  }

  return cell.text.trim();
}

function groupRows(rows: SearchRow[]) {
  const grouped = new Map<string, SearchResult>();

  for (const row of rows) {
    const key = `${row.postalCode}::${row.assigneeName}`;
    const current =
      grouped.get(key) ??
      ({
        postalCode: row.postalCode,
        assigneeName: row.assigneeName,
        localities: [],
        adminAreas: [],
        secondaryAreas: [],
      } satisfies SearchResult);

    if (row.locality && !current.localities.includes(row.locality)) {
      current.localities.push(row.locality);
    }

    if (row.admin1 && !current.adminAreas.includes(row.admin1)) {
      current.adminAreas.push(row.admin1);
    }

    if (row.admin2 && !current.secondaryAreas.includes(row.admin2)) {
      current.secondaryAreas.push(row.admin2);
    }

    grouped.set(key, current);
  }

  for (const result of grouped.values()) {
    result.localities.sort(deCollator.compare);
    result.adminAreas.sort(deCollator.compare);
    result.secondaryAreas.sort(deCollator.compare);
  }

  return [...grouped.values()].sort((left, right) =>
    left.postalCode.localeCompare(right.postalCode),
  );
}

function maybeSkipHeader(firstValue: string, secondValue: string) {
  const headerText = `${firstValue} ${secondValue}`.toLowerCase();
  return (
    /(postal|zip|plz)/.test(headerText) &&
    /(owner|assignee|person|name|berater|zustandig)/.test(headerText)
  );
}

function isLikelyHeaderRow(firstValue: string, secondValue: string, rowNumber: number) {
  if (rowNumber !== 1) {
    return false;
  }

  if (maybeSkipHeader(firstValue, secondValue)) {
    return true;
  }

  return !/\d/.test(firstValue);
}

type WorksheetScan = {
  worksheet: ExcelJS.Worksheet;
  validRows: number;
  nonEmptyRows: number;
};

function scanWorksheet(worksheet: ExcelJS.Worksheet): WorksheetScan {
  let validRows = 0;
  let nonEmptyRows = 0;

  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    const firstValue = readCellText(row.getCell(1));
    const secondValue = readCellText(row.getCell(2));
    const thirdValue = readCellText(row.getCell(3));

    if (!firstValue && !secondValue && !thirdValue) {
      return;
    }

    nonEmptyRows += 1;

    if (isLikelyHeaderRow(firstValue, secondValue, rowNumber)) {
      return;
    }

    if (firstValue && secondValue && !thirdValue) {
      validRows += 1;
    }
  });

  return {
    worksheet,
    validRows,
    nonEmptyRows,
  };
}

function pickWorksheet(workbook: ExcelJS.Workbook) {
  const ranked = workbook.worksheets
    .map(scanWorksheet)
    .sort((left, right) => {
      if (right.validRows !== left.validRows) {
        return right.validRows - left.validRows;
      }

      if (right.nonEmptyRows !== left.nonEmptyRows) {
        return right.nonEmptyRows - left.nonEmptyRows;
      }

      return 0;
    });

  return ranked[0]?.worksheet ?? workbook.worksheets[0];
}

async function parseWorkbook(file: File): Promise<ParsedWorkbook> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());

  const worksheet = pickWorksheet(workbook);

  if (!worksheet) {
    throw new Error("Die Datei enthält kein Tabellenblatt.");
  }

  const deduplicated = new Map<string, { postalCode: string; assigneeName: string }>();
  let sourceRowCount = 0;

  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    const firstValue = readCellText(row.getCell(1));
    const secondValue = readCellText(row.getCell(2));
    const thirdValue = readCellText(row.getCell(3));

    if (!firstValue && !secondValue && !thirdValue) {
      return;
    }

    if (isLikelyHeaderRow(firstValue, secondValue, rowNumber)) {
      return;
    }

    if (!firstValue || !secondValue) {
      throw new Error(
        `Zeile ${rowNumber} muss eine PLZ und eine zuständige Person enthalten.`,
      );
    }

    if (thirdValue) {
      throw new Error(
        `Zeile ${rowNumber} enthält Daten in Spalte 3. Es sind nur zwei Spalten erlaubt.`,
      );
    }

    const postalCode = normalizeImportedPostalCode(firstValue);
    deduplicated.set(postalCode, {
      postalCode,
      assigneeName: secondValue,
    });
    sourceRowCount += 1;
  });

  if (deduplicated.size === 0) {
    throw new Error("Das Tabellenblatt enthält keine verwertbaren Daten.");
  }

  return {
    records: [...deduplicated.values()],
    deduplicatedCount: sourceRowCount - deduplicated.size,
    worksheetName: worksheet.name,
  };
}

function searchByPostalCode(query: string): SearchResponse {
  const db = getDatabase();
  const exactCandidate = sanitizePostalCode(query);
  const paddedCandidate =
    /^\d{1,5}$/.test(exactCandidate) && exactCandidate.length < 5
      ? exactCandidate.padStart(5, "0")
      : exactCandidate;

  let rows = db
    .prepare(`
      SELECT
        a.postal_code AS postalCode,
        a.assignee_name AS assigneeName,
        pr.locality AS locality,
        pr.admin1 AS admin1,
        pr.admin2 AS admin2
      FROM assignments a
      LEFT JOIN postal_reference pr ON pr.postal_code = a.postal_code
      WHERE a.postal_code IN (?, ?)
      ORDER BY a.postal_code, pr.locality
    `)
    .all(exactCandidate, paddedCandidate) as SearchRow[];

  let mode: SearchMode = "postal-exact";

  if (rows.length === 0) {
    rows = db
      .prepare(`
        SELECT
          a.postal_code AS postalCode,
          a.assignee_name AS assigneeName,
          pr.locality AS locality,
          pr.admin1 AS admin1,
          pr.admin2 AS admin2
        FROM assignments a
        LEFT JOIN postal_reference pr ON pr.postal_code = a.postal_code
        WHERE a.postal_code LIKE ?
        ORDER BY a.postal_code, pr.locality
        LIMIT 50
      `)
      .all(`${exactCandidate}%`) as SearchRow[];
    mode = "postal-prefix";
  }

  return {
    mode,
    results: groupRows(rows),
  };
}

function searchByCity(query: string): SearchResponse {
  const db = getDatabase();
  const strict = normalizeLocalityStrict(query);
  const loose = normalizeLocalityLoose(query);
  const rows = db
    .prepare(`
      SELECT
        a.postal_code AS postalCode,
        a.assignee_name AS assigneeName,
        pr.locality AS locality,
        pr.admin1 AS admin1,
        pr.admin2 AS admin2
      FROM postal_reference pr
      INNER JOIN assignments a ON a.postal_code = pr.postal_code
      WHERE pr.normalized_locality LIKE ? OR pr.normalized_locality_loose LIKE ?
      ORDER BY pr.locality, a.postal_code
      LIMIT 100
    `)
    .all(`%${strict}%`, `%${loose}%`) as SearchRow[];

  return {
    mode: "city",
    results: groupRows(rows),
  };
}

export function searchAssignments(query: string): SearchResponse {
  if (looksLikePostalCode(query)) {
    return searchByPostalCode(query);
  }

  return searchByCity(query);
}

export function getDashboardOverview(): DashboardOverview {
  const db = getDatabase();
  const assignmentCount = db
    .prepare("SELECT COUNT(1) AS count FROM assignments")
    .get() as CountRow;
  const postalReferenceCount = db
    .prepare("SELECT COUNT(1) AS count FROM postal_reference")
    .get() as CountRow;
  const lastImport = db
    .prepare(`
      SELECT
        file_name AS fileName,
        record_count AS recordCount,
        imported_by AS importedBy,
        imported_at AS importedAt
      FROM import_history
      ORDER BY imported_at DESC
      LIMIT 1
    `)
    .get() as ImportHistoryRow | undefined;

  return {
    assignmentCount: assignmentCount.count,
    postalReferenceCount: postalReferenceCount.count,
    lastImport: lastImport ?? null,
  };
}

export async function replaceAssignmentsFromWorkbook(file: File, importedBy: string) {
  const { records, deduplicatedCount, worksheetName } = await parseWorkbook(file);
  const db = getDatabase();
  const importedAt = new Date().toISOString();
  const insertAssignment = db.prepare(`
    INSERT INTO assignments (postal_code, assignee_name, imported_at, imported_by)
    VALUES (?, ?, ?, ?)
  `);
  const insertImportLog = db.prepare(`
    INSERT INTO import_history (file_name, record_count, imported_by, imported_at)
    VALUES (?, ?, ?, ?)
  `);

  db.exec("BEGIN IMMEDIATE");

  try {
    db.exec("DELETE FROM assignments");

    for (const record of records) {
      insertAssignment.run(
        record.postalCode,
        record.assigneeName,
        importedAt,
        importedBy,
      );
    }

    insertImportLog.run(file.name || "assignments.xlsx", records.length, importedBy, importedAt);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  return {
    insertedCount: records.length,
    deduplicatedCount,
    importedAt,
    worksheetName,
  };
}

