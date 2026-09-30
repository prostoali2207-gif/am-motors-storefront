import type { Vehicle } from "@/domain/vehicle";
import type { Locale } from "@/i18n/locales";
import { messages } from "@/i18n/messages";
import { formatNumber } from "@/i18n/numbers";
import { displayVehicleValue } from "@/i18n/vehicle-values";

/**
 * Display formatting only — values come from the public model unchanged.
 * Digit grouping is provisional: AED formatting rules are an open question in
 * docs/business-rules.md. The currency is written as "AED" in every language.
 */
export function formatPriceAed(amount: number, locale: Locale): string {
  return `AED ${formatNumber(amount, locale)}`;
}

export function formatMileageKm(km: number, locale: Locale): string {
  return `${formatNumber(km, locale)} ${messages(locale).kmUnit}`;
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
 * transmission. Only values that exist; categorical values use the approved display dictionary
 * (src/i18n/vehicle-values.ts), anything else is shown as the Sheet writes it.
 */
export function keyFacts(
  vehicle: Pick<Vehicle, "mileageKm" | "regionalSpec" | "transmission">,
  locale: Locale,
): string[] {
  return [
    vehicle.mileageKm === null ? null : formatMileageKm(vehicle.mileageKm, locale),
    displayVehicleValue("regionalSpec", vehicle.regionalSpec, locale),
    displayVehicleValue("transmission", vehicle.transmission, locale),
  ].filter(present);
}

/** "1 car available" / "12 cars available" — a count of what the source returned, nothing more. */
export function availableCount(count: number, locale: Locale): string {
  return messages(locale).availableCount(count);
}
