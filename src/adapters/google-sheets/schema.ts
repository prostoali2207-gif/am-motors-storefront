import type { Vehicle, VehicleStatus } from "@/domain/vehicle";

/**
 * Schema of the Google Sheet "AM Motors — Справочник машин", tab "Машины".
 *
 * Mirrors the confirmed snapshot in `docs/business-rules.md` and the classification in
 * `.claude/skills/protecting-commercial-truth/field-policy.md`. Change all three together.
 */

/** The only tab the adapter reads. */
export const SHEET_TAB = "Машины";

/** Confirmed header snapshot (26 columns, in order). Used for drift diagnostics only. */
export const EXPECTED_HEADER = [
  "ID",
  "Марка",
  "Модель",
  "Комплектация",
  "Год",
  "Цена, AED",
  "Статус",
  "Пробег, км",
  "Региональная спецификация",
  "Цвет",
  "Двигатель",
  "Топливо",
  "Коробка",
  "Привод",
  "Состояние",
  "VIN",
  "Аварии / крашеные детали",
  "Сервисная история",
  "Владельцев",
  "Мулькия до",
  "Банковский залог",
  "Ссылка на фото/видео",
  "Ссылка на пост",
  "Мин. цена, AED",
  "Заметки",
  "Дата обновления",
] as const;

/**
 * Explicit allowlist: public field → Sheet column. These are the only columns ever requested
 * from the Sheets API. Every other column (private, pending, server-only, or unknown/new) is
 * never fetched, so its values cannot reach the cache, logs, or the client.
 *
 * `satisfies Record<SheetBackedField, …>` makes this fail to compile if `Vehicle` and the
 * mapping drift apart.
 */
export const PUBLIC_COLUMNS = {
  id: "ID",
  make: "Марка",
  model: "Модель",
  trim: "Комплектация",
  year: "Год",
  priceAed: "Цена, AED",
  status: "Статус",
  mileageKm: "Пробег, км",
  regionalSpec: "Региональная спецификация",
  color: "Цвет",
  engine: "Двигатель",
  fuel: "Топливо",
  transmission: "Коробка",
  drivetrain: "Привод",
} as const satisfies Record<SheetBackedField, (typeof EXPECTED_HEADER)[number]>;

/** Public fields that come straight from one Sheet column (`media` is resolved from Drive). */
type SheetBackedField = Exclude<keyof Vehicle, "media">;

/**
 * Server/source-only column read only when the Drive media source is enabled (Phase 3). Its
 * value (a Drive folder link) is parsed into a folder reference server-side and never becomes a
 * public field, a log line or client data.
 */
export const MEDIA_LINK_COLUMN = "Ссылка на фото/видео" satisfies (typeof EXPECTED_HEADER)[number];

export type PublicField = keyof typeof PUBLIC_COLUMNS;

export const PUBLIC_FIELDS = Object.keys(PUBLIC_COLUMNS) as PublicField[];

/**
 * Fields whose Sheet cells hold numeric effective values. All public columns are read with
 * `UNFORMATTED_VALUE`, so these arrive as numbers ("AED" / "km" are only number formatting)
 * and every other public column arrives as text. Formatted display strings are never parsed.
 */
export const NUMERIC_FIELDS = ["year", "priceAed", "mileageKm"] as const satisfies readonly PublicField[];

/**
 * Confirmed `Статус` values. Exact match after trimming; anything else is not public
 * (fail closed). A reserved/on-hold status is not confirmed and deliberately absent.
 */
export const STATUS_MAP: ReadonlyMap<string, VehicleStatus> = new Map([
  ["В наличии", "available"],
  ["Продана", "sold"],
]);
