import type { Vehicle } from "@/domain/vehicle";
import { InventorySourceError } from "@/inventory/source-error";
import { checkHeader, columnRange, headerRange } from "./header";
import { mapRows, type RowIssue, type SourceRow } from "./mapping";
import { PUBLIC_COLUMNS, PUBLIC_FIELDS, SHEET_TAB, type PublicField } from "./schema";
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
 * 1. Read the header row; locate the 14 allowlisted columns by exact name.
 * 2. Read exactly those columns in ONE `values.batchGet` with `UNFORMATTED_VALUE`: text cells
 *    arrive as strings, numeric effective values (year, price, mileage) as numbers. No other
 *    column is requested and no formatted string is parsed.
 * 3. Verify every returned column still starts with its expected header. This catches columns
 *    that moved or were renamed between the header read and the data read → fail closed.
 * 4. Map rows field by field and validate.
 *
 * Consistency limits (deliberately not overstated): all row data comes from a single request,
 * so there is no mixing of values from two separate data reads. Google does not document
 * `batchGet` as a transactional snapshot, and an edit that only changes row contents (not the
 * header) is indistinguishable from a normal edit; the next refresh picks it up within the
 * freshness window.
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

  const ranges = PUBLIC_FIELDS.map((field) => columnRange(SHEET_TAB, header.positions[field]));
  const data = await reader.readColumns(ranges);

  const columns = new Map<PublicField, unknown[]>();
  PUBLIC_FIELDS.forEach((field, i) => {
    const cells = data[i];
    const first = cells?.[0];
    if (typeof first !== "string" || first.trim() !== PUBLIC_COLUMNS[field]) {
      throw new InventorySourceError("source-error", "header-changed-during-read");
    }
    columns.set(field, cells);
  });

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

function formatIssues(issues: readonly RowIssue[]): string {
  if (issues.length === 0) return "none";
  const byCode = new Map<string, number[]>();
  for (const { code, rowNumber } of issues) {
    byCode.set(code, [...(byCode.get(code) ?? []), rowNumber]);
  }
  return [...byCode].map(([code, rows]) => `${code} at row(s) ${rows.join(",")}`).join("; ");
}
