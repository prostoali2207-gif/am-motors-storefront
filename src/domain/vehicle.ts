/**
 * Public vehicle model — an explicit allowlist.
 *
 * Mirrors the V1 public candidates in
 * `.claude/skills/protecting-commercial-truth/field-policy.md`. Every field maps to one
 * existing column of the Google Sheet "AM Motors — Справочник машин". Private, pending and
 * server-only columns (VIN, Мин. цена, Заметки, Состояние, links, dates, …) are deliberately
 * absent and must never be added here without a recorded business decision.
 *
 * Not in V1: condition (pending decision), media (Phase 3), and any field the Sheet does not
 * have (body type, interior color, description, options, …).
 */

/** Confirmed Sheet values: "В наличии" → available, "Продана" → sold. Nothing else is public. */
export const VEHICLE_STATUSES = ["available", "sold"] as const;
export type VehicleStatus = (typeof VEHICLE_STATUSES)[number];

export interface Vehicle {
  /** `ID` — authoritative value, used verbatim in `/cars/<id>`. Non-empty and unique. */
  readonly id: string;
  /** `Статус` */
  readonly status: VehicleStatus;
  /** `Марка` */
  readonly make: string;
  /** `Модель` */
  readonly model: string;
  /** `Комплектация` */
  readonly trim: string | null;
  /** `Год` */
  readonly year: number;
  /** `Цена, AED` — numeric effective value in the Sheet. */
  readonly priceAed: number | null;
  /** `Пробег, км` — numeric effective value in the Sheet. */
  readonly mileageKm: number | null;
  /** `Региональная спецификация` */
  readonly regionalSpec: string | null;
  /** `Цвет` */
  readonly color: string | null;
  /** `Двигатель` */
  readonly engine: string | null;
  /** `Топливо` */
  readonly fuel: string | null;
  /** `Коробка` */
  readonly transmission: string | null;
  /** `Привод` */
  readonly drivetrain: string | null;
}

/** Runtime copy of the allowlist, kept in lockstep with `Vehicle` by the type below. */
export const PUBLIC_VEHICLE_FIELDS = [
  "id",
  "status",
  "make",
  "model",
  "trim",
  "year",
  "priceAed",
  "mileageKm",
  "regionalSpec",
  "color",
  "engine",
  "fuel",
  "transmission",
  "drivetrain",
] as const satisfies readonly (keyof Vehicle)[];

// Compile-time guard: fails if `Vehicle` gains a key that is not in the allowlist.
type MissingFromAllowlist = Exclude<keyof Vehicle, (typeof PUBLIC_VEHICLE_FIELDS)[number]>;
const allowlistIsComplete: MissingFromAllowlist extends never ? true : never = true;
void allowlistIsComplete;

export function isVehicleStatus(value: unknown): value is VehicleStatus {
  return typeof value === "string" && (VEHICLE_STATUSES as readonly string[]).includes(value);
}

/** Title built only from public fields that exist: year make model trim. */
export function vehicleTitle(vehicle: Pick<Vehicle, "year" | "make" | "model" | "trim">): string {
  return [String(vehicle.year), vehicle.make, vehicle.model, vehicle.trim]
    .filter((part): part is string => part !== null && part.trim() !== "")
    .join(" ");
}
