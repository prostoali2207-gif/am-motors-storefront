import { EXPECTED_HEADER, PUBLIC_COLUMNS, PUBLIC_FIELDS, type PublicField } from "./schema";

export type ColumnPositions = Readonly<Record<PublicField, number>>;

export type HeaderCheck =
  | {
      readonly ok: true;
      /** Zero-based column index of each public field. */
      readonly positions: ColumnPositions;
      /** Header cells not in the confirmed snapshot (new columns — private by default). */
      readonly unexpectedColumnCount: number;
      /** Snapshot columns (non-public ones) no longer present. */
      readonly missingSnapshotColumns: readonly string[];
    }
  | {
      readonly ok: false;
      readonly problem: "missing-public-column" | "duplicate-public-column";
      /** Sheet column names (schema, not row data). */
      readonly columns: readonly string[];
    };

function headerName(cell: unknown): string {
  return typeof cell === "string" ? cell.trim() : "";
}

/**
 * Locates the allowlisted columns by exact header name. Column order does not matter, and
 * unknown columns are ignored (never read). A public column that is missing or appears twice
 * makes the whole source invalid: we cannot tell which values are authoritative.
 */
export function checkHeader(headerRow: readonly unknown[]): HeaderCheck {
  const names = headerRow.map(headerName);

  const missing: string[] = [];
  const duplicated: string[] = [];
  const positions: Partial<Record<PublicField, number>> = {};

  for (const field of PUBLIC_FIELDS) {
    const column = PUBLIC_COLUMNS[field];
    const indexes = names.flatMap((name, index) => (name === column ? [index] : []));
    if (indexes.length === 0) missing.push(column);
    else if (indexes.length > 1) duplicated.push(column);
    else positions[field] = indexes[0];
  }

  if (missing.length > 0) return { ok: false, problem: "missing-public-column", columns: missing };
  if (duplicated.length > 0) return { ok: false, problem: "duplicate-public-column", columns: duplicated };

  const expected = new Set<string>(EXPECTED_HEADER);
  const present = new Set(names);
  return {
    ok: true,
    positions: positions as ColumnPositions,
    unexpectedColumnCount: names.filter((name) => name !== "" && !expected.has(name)).length,
    missingSnapshotColumns: EXPECTED_HEADER.filter((name) => !present.has(name)),
  };
}

/** Locates one column by exact header name: its index, or why it cannot be used. */
export function locateColumn(headerRow: readonly unknown[], column: string): number | "missing" | "duplicate" {
  const indexes = headerRow.flatMap((cell, index) => (headerName(cell) === column ? [index] : []));
  if (indexes.length === 0) return "missing";
  return indexes.length > 1 ? "duplicate" : indexes[0];
}

/** Zero-based column index → A1 column letters (0 → A, 25 → Z, 26 → AA). */
export function columnLetter(index: number): string {
  if (!Number.isInteger(index) || index < 0) throw new RangeError("column index out of range");
  let n = index + 1;
  let letters = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    letters = String.fromCharCode(65 + rem) + letters;
    n = Math.floor((n - 1) / 26);
  }
  return letters;
}

/** A1 range for one whole column of the tab, including the header row. */
export function columnRange(tab: string, index: number): string {
  const letter = columnLetter(index);
  return `${quoteTab(tab)}!${letter}1:${letter}`;
}

/** A1 range for the header row of the tab. */
export function headerRange(tab: string): string {
  return `${quoteTab(tab)}!1:1`;
}

function quoteTab(tab: string): string {
  return `'${tab.replaceAll("'", "''")}'`;
}
