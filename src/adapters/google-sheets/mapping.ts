import type { Vehicle, VehicleStatus } from "@/domain/vehicle";
import { isUsableVehicleId } from "@/domain/vehicle-id";
import { PUBLIC_FIELDS, STATUS_MAP, type PublicField } from "./schema";

/**
 * One Sheet row restricted to the allowlisted columns. Values are exactly what the Sheets API
 * returned (formatted text for text columns, effective values for numeric columns).
 * `rowNumber` is the 1-based Sheet row, used for server-side diagnostics only.
 */
export interface SourceRow {
  readonly rowNumber: number;
  readonly cells: Readonly<Record<PublicField, unknown>>;
}

/** Row problems, reported by row number and code only — never with cell values. */
export type RowIssueCode =
  | "missing-id"
  | "duplicate-id"
  | "missing-make"
  | "missing-model"
  | "invalid-year"
  | "invalid-price"
  | "invalid-mileage";

export interface RowIssue {
  readonly rowNumber: number;
  readonly code: RowIssueCode;
}

export interface MappedInventory {
  /** Public vehicles (available and sold). */
  readonly vehicles: Vehicle[];
  /** Rows dropped or fields omitted because of invalid data. */
  readonly issues: RowIssue[];
  /** Rows with a status that is not confirmed as public (count only; values not kept). */
  readonly nonPublicStatusCount: number;
}

export const MIN_YEAR = 1900;

/**
 * Converts source rows into public `Vehicle` objects, field by field.
 *
 * Fail-closed rules: empty or duplicated `ID` → row not public (every row sharing the ID);
 * status other than the confirmed values → not public; missing make/model or invalid year →
 * row not public. Invalid price/mileage → field omitted (`null`), never guessed.
 */
export function mapRows(rows: readonly SourceRow[], currentYear: number): MappedInventory {
  const issues: RowIssue[] = [];
  const candidates = rows.filter((row) => !isBlankRow(row));

  // Duplicates are counted across every non-blank row, whatever its status: if an ID
  // appears twice we cannot tell which row is authoritative.
  const idCounts = new Map<string, number>();
  for (const row of candidates) {
    const id = row.cells.id;
    if (isUsableVehicleId(id)) idCounts.set(id, (idCounts.get(id) ?? 0) + 1);
  }

  const vehicles: Vehicle[] = [];
  let nonPublicStatusCount = 0;

  for (const row of candidates) {
    const { rowNumber, cells } = row;

    const id = cells.id;
    if (!isUsableVehicleId(id)) {
      issues.push({ rowNumber, code: "missing-id" });
      continue;
    }
    if (idCounts.get(id) !== 1) {
      issues.push({ rowNumber, code: "duplicate-id" });
      continue;
    }

    const status = mapStatus(cells.status);
    if (status === null) {
      nonPublicStatusCount += 1;
      continue;
    }

    const make = readText(cells.make);
    if (make === null) {
      issues.push({ rowNumber, code: "missing-make" });
      continue;
    }
    const model = readText(cells.model);
    if (model === null) {
      issues.push({ rowNumber, code: "missing-model" });
      continue;
    }
    const year = readYear(cells.year, currentYear);
    if (year === null) {
      issues.push({ rowNumber, code: "invalid-year" });
      continue;
    }

    const price = readNumber(cells.priceAed, (n) => n > 0);
    if (price.invalid) issues.push({ rowNumber, code: "invalid-price" });
    const mileage = readNumber(cells.mileageKm, (n) => n >= 0);
    if (mileage.invalid) issues.push({ rowNumber, code: "invalid-mileage" });

    // Explicit field-by-field construction. Never spread a source row.
    vehicles.push({
      id,
      status,
      make,
      model,
      trim: readText(cells.trim),
      year,
      priceAed: price.value,
      mileageKm: mileage.value,
      regionalSpec: readText(cells.regionalSpec),
      color: readText(cells.color),
      engine: readText(cells.engine),
      fuel: readText(cells.fuel),
      transmission: readText(cells.transmission),
      drivetrain: readText(cells.drivetrain),
    });
  }

  return { vehicles, issues, nonPublicStatusCount };
}

export function mapStatus(value: unknown): VehicleStatus | null {
  if (typeof value !== "string") return null;
  return STATUS_MAP.get(value.trim()) ?? null;
}

function isEmptyCell(value: unknown): boolean {
  return value === undefined || value === null || (typeof value === "string" && value.trim() === "");
}

function isBlankRow(row: SourceRow): boolean {
  return PUBLIC_FIELDS.every((field) => isEmptyCell(row.cells[field]));
}

/** Text "as written": whitespace-normalized only. Non-text or empty → null. */
function readText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.replace(/\s+/g, " ").trim();
  return text === "" ? null : text;
}

/** `Год` must be a numeric integer cell in a plausible range; text is not parsed. */
function readYear(value: unknown, currentYear: number): number | null {
  if (typeof value !== "number" || !Number.isInteger(value)) return null;
  return value >= MIN_YEAR && value <= currentYear + 1 ? value : null;
}

/**
 * Numeric effective value. Empty → null (missing). Anything that is not a finite number
 * accepted by `valid` — including text such as "AED 50,000" — is invalid: omitted, reported,
 * never parsed.
 */
function readNumber(
  value: unknown,
  valid: (n: number) => boolean,
): { value: number | null; invalid: boolean } {
  if (isEmptyCell(value)) return { value: null, invalid: false };
  if (typeof value === "number" && Number.isFinite(value) && valid(value)) {
    return { value, invalid: false };
  }
  return { value: null, invalid: true };
}
