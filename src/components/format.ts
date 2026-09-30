import type { Vehicle } from "@/domain/vehicle";

/**
 * Display formatting only — values come from the public model unchanged.
 * Digit grouping is provisional: AED formatting rules are an open question in
 * docs/business-rules.md.
 */
const grouped = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

export function formatPriceAed(amount: number): string {
  return `AED ${grouped.format(amount)}`;
}

export function formatMileageKm(km: number): string {
  return `${grouped.format(km)} km`;
}

function present(value: string | null): value is string {
  return value !== null && value.trim() !== "";
}

/** Model and trim as they exist in the Sheet (the car title without year and make). */
export function modelLine(vehicle: Pick<Vehicle, "model" | "trim">): string {
  return [vehicle.model, vehicle.trim].filter(present).join(" ");
}

/** Make · year eyebrow. */
export function makeYearLine(vehicle: Pick<Vehicle, "make" | "year">): string {
  return [vehicle.make, String(vehicle.year)].filter(present).join(" · ");
}

/**
 * Key facts for cards and the VDP summary line, in a fixed order: mileage, regional spec,
 * transmission. Only values that exist; Sheet text is shown verbatim (open question 6).
 */
export function keyFacts(vehicle: Pick<Vehicle, "mileageKm" | "regionalSpec" | "transmission">): string[] {
  return [
    vehicle.mileageKm === null ? null : formatMileageKm(vehicle.mileageKm),
    vehicle.regionalSpec,
    vehicle.transmission,
  ].filter(present);
}

/** "1 car available" / "12 cars available" — a count of what the source returned, nothing more. */
export function availableCount(count: number): string {
  return `${grouped.format(count)} ${count === 1 ? "car" : "cars"} available`;
}
