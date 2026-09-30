import type { SheetsReader } from "@/adapters/google-sheets/sheets-client";
import { EXPECTED_HEADER } from "@/adapters/google-sheets/schema";

/**
 * SYNTHETIC TEST SHEET. Emulates the Sheets API `values` semantics used by the adapter
 * (A1 column ranges, UNFORMATTED_VALUE effective values, COLUMNS major dimension, trailing
 * empty cells trimmed) and records every request. Never contains real Sheet data.
 */

/** A cell's effective value: string for text cells, number for numeric cells. */
export type FakeCell = string | number | boolean | undefined;

export type FakeRow = Partial<Record<string, FakeCell>>;

/** Values placed in every private column so tests can prove they never leak. */
export const PRIVATE_MARKERS: Readonly<Record<string, string>> = {
  Состояние: "PRIVATE-CONDITION-MARKER",
  VIN: "PRIVATE-VIN-MARKER",
  "Аварии / крашеные детали": "PRIVATE-ACCIDENT-MARKER",
  "Сервисная история": "PRIVATE-SERVICE-MARKER",
  Владельцев: "PRIVATE-OWNERS-MARKER",
  "Мулькия до": "PRIVATE-MULKIYA-MARKER",
  "Банковский залог": "PRIVATE-LIEN-MARKER",
  "Ссылка на фото/видео": "PRIVATE-MEDIA-LINK-MARKER",
  "Ссылка на пост": "PRIVATE-POST-LINK-MARKER",
  "Мин. цена, AED": "PRIVATE-MIN-PRICE-MARKER",
  Заметки: "PRIVATE-NOTES-MARKER",
  "Дата обновления": "PRIVATE-UPDATED-MARKER",
};

export class FakeSheet implements SheetsReader {
  readonly requestedRanges: string[] = [];
  /** Ranges of each `readColumns` (values.batchGet) call, in call order. */
  readonly batchCalls: string[][] = [];
  header: string[];
  rows: FakeRow[];
  /** Called between the header read and the column reads (to simulate concurrent edits). */
  onAfterHeader?: () => void;

  constructor(rows: FakeRow[], header: readonly string[] = EXPECTED_HEADER) {
    this.header = [...header];
    this.rows = rows;
  }

  async readRow(range: string): Promise<unknown[]> {
    this.requestedRanges.push(range);
    if (!/^'Машины'!1:1$/.test(range)) throw new Error(`unexpected row range ${range}`);
    const row = trimTrailing([...this.header]);
    this.onAfterHeader?.();
    return row;
  }

  async readColumns(ranges: readonly string[]): Promise<unknown[][]> {
    this.batchCalls.push([...ranges]);
    return ranges.map((range) => {
      this.requestedRanges.push(range);
      const match = /^'Машины'!([A-Z]+)1:([A-Z]+)$/.exec(range);
      if (!match || match[1] !== match[2]) throw new Error(`unexpected column range ${range}`);
      const index = letterIndex(match[1]);
      const name = this.header[index];
      const cells: unknown[] = [name];
      for (const row of this.rows) {
        cells.push(name === undefined ? "" : (row[name] ?? ""));
      }
      return trimTrailing(cells);
    });
  }

  /** Column names whose ranges were requested (header row excluded). */
  requestedColumnNames(): string[] {
    return this.requestedRanges
      .map((range) => /^'Машины'!([A-Z]+)1:/.exec(range)?.[1])
      .filter((letters): letters is string => letters !== undefined)
      .map((letters) => this.header[letterIndex(letters)]);
  }
}

/** A complete synthetic row with every column filled, including private markers. */
export function syntheticRow(overrides: FakeRow = {}): FakeRow {
  return {
    ID: "TEST-0001",
    Марка: "Testmake",
    Модель: "Fixture Alpha",
    Комплектация: "Synthetic Trim",
    Год: 2001,
    "Цена, AED": 11111,
    Статус: "В наличии",
    "Пробег, км": 22222,
    "Региональная спецификация": "Test spec",
    Цвет: "Test color",
    Двигатель: "Test engine",
    Топливо: "Test fuel",
    Коробка: "Test gearbox",
    Привод: "Test drive",
    ...PRIVATE_MARKERS,
    ...overrides,
  };
}

function trimTrailing(cells: unknown[]): unknown[] {
  let end = cells.length;
  while (end > 0 && (cells[end - 1] === "" || cells[end - 1] === undefined)) end--;
  return cells.slice(0, end);
}

function letterIndex(letters: string): number {
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}
