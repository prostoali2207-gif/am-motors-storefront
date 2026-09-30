import type { DriveFolderRef } from "@/adapters/google-drive-media/folder-link";
import type { Vehicle } from "@/domain/vehicle";
import { InventorySourceError } from "@/inventory/source-error";
import { checkHeader, columnRange, headerRange, locateColumn } from "./header";
import { mapRows, type RowIssue, type SourceRow } from "./mapping";
import { MEDIA_LINK_COLUMN, PUBLIC_COLUMNS, PUBLIC_FIELDS, SHEET_TAB, type PublicField } from "./schema";
import type { SheetsReader } from "./sheets-client";

export interface InventorySnapshot {
  /** Public vehicles only (available and sold). Never raw rows. */
  readonly vehicles: readonly Vehicle[];
  /** Epoch ms when the Sheet was read. Used to bound staleness. */
  readonly fetchedAt: number;
  /**
   * SERVER-ONLY: Drive folder reference per public vehicle ID (empty when media links are not
   * read). Lives only in the server-side data cache; repositories never hand it to pages.
   */
  readonly mediaFolders: readonly (readonly [vehicleId: string, folder: DriveFolderRef])[];
}

export interface LoaderLog {
  info(message: string): void;
  warn(message: string): void;
}

export interface LoadOptions {
  readonly now?: () => number;
  readonly log?: LoaderLog;
  /**
   * Also read the server/source-only `Ссылка на фото/видео` column (Drive media enabled).
   * A missing or duplicated media column never fails the inventory: media is then unavailable
   * for every vehicle.
   */
  readonly readMediaLinks?: boolean;
}

const PREFIX = "[inventory:sheets]";

/**
 * Reads the "Машины" tab and returns public vehicles.
 *
 * 1. Read the header row; locate the 14 allowlisted columns by exact name.
 * 2. Read exactly those columns in ONE `values.batchGet` with `UNFORMATTED_VALUE`: text cells
 *    arrive as strings, numeric effective values (year, price, mileage) as numbers. The only
 *    other column ever requested is the server/source-only `Ссылка на фото/видео`, and only
 *    when `readMediaLinks` is set. No formatted string is parsed.
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

  const headerRow = await reader.readRow(headerRange(SHEET_TAB));
  const header = checkHeader(headerRow);
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

  // The media link column rides in the same batchGet, as the last range.
  let mediaColumn: number | null = null;
  if (options.readMediaLinks) {
    const located = locateColumn(headerRow, MEDIA_LINK_COLUMN);
    if (typeof located === "number") mediaColumn = located;
    else log.warn(`${PREFIX} media link column ${located}: media unavailable for all vehicles`);
  }
  if (mediaColumn !== null) ranges.push(columnRange(SHEET_TAB, mediaColumn));

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

  let mediaLinks: unknown[] | null = null;
  if (mediaColumn !== null) {
    const cells = data[PUBLIC_FIELDS.length];
    const first = cells?.[0];
    if (typeof first !== "string" || first.trim() !== MEDIA_LINK_COLUMN) {
      throw new InventorySourceError("source-error", "header-changed-during-read");
    }
    mediaLinks = cells;
  }

  const rowCount = Math.max(...[...columns.values()].map((cells) => cells.length)) - 1;
  const rows: SourceRow[] = [];
  for (let i = 1; i <= rowCount; i++) {
    const cells = {} as Record<PublicField, unknown>;
    for (const [field, values] of columns) cells[field] = values[i];
    rows.push({ rowNumber: i + 1, cells, mediaLink: mediaLinks?.[i] });
  }

  const fetchedAt = now();
  const mapped = mapRows(rows, new Date(fetchedAt).getUTCFullYear());
  const available = mapped.vehicles.filter((v) => v.status === "available").length;
  log.info(
    `${PREFIX} read ok: ${mapped.vehicles.length} public ` +
      `(${available} available, ${mapped.vehicles.length - available} sold), ` +
      `${mapped.nonPublicStatusCount} with non-public status, ` +
      `issues: ${formatIssues(mapped.issues)}` +
      (mediaColumn === null ? "" : `, media links: ${formatLinkKinds(mapped.mediaFolders)}`),
  );

  return {
    vehicles: mapped.vehicles,
    fetchedAt,
    mediaFolders: mediaColumn === null ? [] : mapped.mediaFolders,
  };
}

/** Counts only — links and folder IDs are never logged. */
function formatLinkKinds(folders: readonly (readonly [string, DriveFolderRef])[]): string {
  const count = (kind: DriveFolderRef["kind"]) => folders.filter(([, ref]) => ref.kind === kind).length;
  return `${count("folder")} folder, ${count("missing")} missing, ${count("invalid")} invalid`;
}

function formatIssues(issues: readonly RowIssue[]): string {
  if (issues.length === 0) return "none";
  const byCode = new Map<string, number[]>();
  for (const { code, rowNumber } of issues) {
    byCode.set(code, [...(byCode.get(code) ?? []), rowNumber]);
  }
  return [...byCode].map(([code, rows]) => `${code} at row(s) ${rows.join(",")}`).join("; ");
}
