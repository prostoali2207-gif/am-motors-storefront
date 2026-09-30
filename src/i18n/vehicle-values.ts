import type { Locale } from "./locales";

/**
 * Localized DISPLAY labels for known categorical Sheet values (Phase 7).
 *
 * Only these exact source values (after trimming) have a display label; everything else — and
 * every free-text or factual field (make, model, trim, ID, price, mileage, engine, year) — is
 * shown exactly as the Sheet provides it. A value missing here is never guessed or
 * translated on the fly: the original public value is shown instead.
 *
 * Adding a value: add the exact Sheet spelling with all three labels, record it in
 * docs/business-rules.md → "Localized display values", and extend the tests.
 */
export type CategoricalField = "regionalSpec" | "transmission" | "fuel" | "drivetrain" | "color";

type Labels = Readonly<Record<Locale, string>>;

export const VEHICLE_VALUE_LABELS: Readonly<Record<CategoricalField, Readonly<Record<string, Labels>>>> = {
  regionalSpec: {
    GCC: { en: "GCC", ar: "مواصفات خليجية", ru: "GCC" },
    "American Specs": { en: "American Specs", ar: "مواصفات أمريكية", ru: "Американская спецификация" },
    "Korean Specs": { en: "Korean Specs", ar: "مواصفات كورية", ru: "Корейская спецификация" },
  },
  transmission: {
    Автомат: { en: "Automatic", ar: "أوتوماتيك", ru: "Автомат" },
    CVT: { en: "CVT", ar: "CVT", ru: "Вариатор (CVT)" },
  },
  fuel: {
    Бензин: { en: "Petrol", ar: "بنزين", ru: "Бензин" },
  },
  drivetrain: {
    FWD: { en: "FWD", ar: "دفع أمامي", ru: "Передний (FWD)" },
  },
  // Current colour values of the live Sheet — confirmed 2026-09-30. Any other colour stays verbatim.
  color: {
    White: { en: "White", ar: "أبيض", ru: "Белый" },
    Silver: { en: "Silver", ar: "فضي", ru: "Серебристый" },
    Red: { en: "Red", ar: "أحمر", ru: "Красный" },
    Black: { en: "Black", ar: "أسود", ru: "Чёрный" },
    Orange: { en: "Orange", ar: "برتقالي", ru: "Оранжевый" },
  },
};

/**
 * The label to show for a categorical value, or the original public value when it is not in the
 * approved dictionary. `null` stays `null` (missing is shown as missing).
 */
export function displayVehicleValue(field: CategoricalField, value: string | null, locale: Locale): string | null {
  if (value === null) return null;
  const known = VEHICLE_VALUE_LABELS[field];
  const key = value.trim();
  // Own keys only: a Sheet value such as "constructor" must never resolve to a prototype member.
  const labels = Object.prototype.hasOwnProperty.call(known, key) ? known[key] : undefined;
  return labels === undefined ? value : labels[locale];
}
