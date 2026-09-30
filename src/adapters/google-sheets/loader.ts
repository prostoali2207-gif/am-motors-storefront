import type { Vehicle } from "@/domain/vehicle";
import { InventorySourceError } from "@/inventory/source-error";
import { checkHeader, columnRange, headerRange } from "./header";
import { mapRows, type RowIssue, type SourceRow } from "./mapping";
import { NUMERIC_FIELDS, PUBLIC_COLUMNS, SHEET_TAB, TEXT_FIELDS, type PublicField } from "./schema";
import type { SheetsReader } from "./sheets-client";

export interface InventorySnapshot {
  /** Public vehicles only (available and sold). Never raw rows. */
  readonly vehicles: readonly Vehicle[];
  /** Epoch ms when the Sheet was read. Used to bound staleness. */
  readonly fetchedAt: number;
}

export interface LoaderLog {
  info(message: string): void;
  warn(message: string): void;
}

export interface LoadOptions {
  readonly now?: () => number;
  readonly log?: LoaderLog;
}

const PREFIX = "[inventory:sheets]";

/**
 * Reads the "Машины" tab and returns public vehicles.
 *
 * 1. Read the header row; locate the allowlisted columns by exact name.
 * 2. Read only those columns: text columns as displayed, numeric columns as effective values.
 *    `ID` is read in both requests so the two can be checked for row alignment.
 * 3. Verify each column still starts with its expected header and IDs line up; otherwise the
 *    Sheet changed mid-read → error (never mix rows).
 * 4. Map rows field by field and validate.
 *
 * Throws `InventorySourceError` on any source or structure problem. Logs contain counts,
 * row numbers and codes only — never cell values.
 */
export async function loadInventorySnapshot(
  reader: SheetsReader,
  options: LoadOptions = {},
): Promise<InventorySnapshot> {
  const now = options.now ?? Date.now;
  const log = options.log ?? console;

  const header = checkHeader(await reader.readRow(headerRange(SHEET_TAB)));
  if (!header.ok) {
    log.warn(`${PREFIX} header check failed: ${header.problem} (${header.columns.join(", ")})`);
    throw new InventorySourceError("invalid-data", header.problem);
  }
  if (header.unexpectedColumnCount > 0 || header.missingSnapshotColumns.length > 0) {
    log.warn(
      `${PREFIX} header differs from the confirmed snapshot: ` +
        `${header.unexpectedColumnCount} unexpected column(s) (not read), ` +
        `missing: ${header.missingSnapshotColumns.join(", ") || "none"}`,
    );
  }

  const rangeOf = (field: PublicField) => columnRange(SHEET_TAB, header.positions[field]);
  const numericRequest: PublicField[] = ["id", ...NUMERIC_FIELDS];

  const [textColumns, numericColumns] = await Promise.all([
    reader.readColumns(TEXT_FIELDS.map(rangeOf), "FORMATTED_VALUE"),
    reader.readColumns(numericRequest.map(rangeOf), "UNFORMATTED_VALUE"),
  ]);

  const columns = new Map<PublicField, unknown[]>();
  TEXT_FIELDS.forEach((field, i) => columns.set(field, textColumns[i]));
  const numericIds = numericColumns[0];
  NUMERIC_FIELDS.forEach((field, i) => columns.set(field, numericColumns[i + 1]));

  for (const [field, cells] of [...columns, ["id", numericIds] as const]) {
    const first = cells[0];
    if (typeof first !== "string" || first.trim() !== PUBLIC_COLUMNS[field]) {
      throw new InventorySourceError("source-error", "header-changed-during-read");
    }
  }
  if (!idsAligned(columns.get("id") ?? [], numericIds)) {
    throw new InventorySourceError("source-error", "rows-changed-during-read");
  }

  const rowCount = Math.max(...[...columns.values()].map((cells) => cells.length)) - 1;
  const rows: SourceRow[] = [];
  for (let i = 1; i <= rowCount; i++) {
    const cells = {} as Record<PublicField, unknown>;
    for (const [field, values] of columns) cells[field] = values[i];
    rows.push({ rowNumber: i + 1, cells });
  }

  const fetchedAt = now();
  const mapped = mapRows(rows, new Date(fetchedAt).getUTCFullYear());
  const available = mapped.vehicles.filter((v) => v.status === "available").length;
  log.info(
    `${PREFIX} read ok: ${mapped.vehicles.length} public ` +
      `(${available} available, ${mapped.vehicles.length - available} sold), ` +
      `${mapped.nonPublicStatusCount} with non-public status, ` +
      `issues: ${formatIssues(mapped.issues)}`,
  );

  return { vehicles: mapped.vehicles, fetchedAt };
}

function isEmpty(value: unknown): boolean {
  return value === undefined || value === null || value === "";
}

/**
 * Formatted and unformatted `ID` columns must describe the same rows. A text ID reads the same
 * both ways; a numeric ID only has to be present in both.
 */
function idsAligned(formatted: readonly unknown[], unformatted: readonly unknown[]): boolean {
  const length = Math.max(formatted.length, unformatted.length);
  for (let i = 0; i < length; i++) {
    const f = formatted[i];
    const u = unformatted[i];
    if (isEmpty(u) !== isEmpty(f)) return false;
    if (typeof u === "string" && u !== f) return false;
  }
  return true;
}

function formatIssues(issues: readonly RowIssue[]): string {
  if (issues.length === 0) return "none";
  const byCode = new Map<string, number[]>();
  for (const { code, rowNumber } of issues) {
    byCode.set(code, [...(byCode.get(code) ?? []), rowNumber]);
  }
  return [...byCode].map(([code, rows]) => `${code} at row(s) ${rows.join(",")}`).join("; ");
}
