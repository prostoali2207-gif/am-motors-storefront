import type { InventoryListResult } from "@/domain/inventory-result";
import type { Locale } from "@/i18n/locales";
import { messages } from "@/i18n/messages";
import { InventoryUnavailable } from "./inventory-unavailable";
import { VehicleCard } from "./vehicle-card";

/**
 * Renders every list state explicitly: ok, empty, unavailable.
 * Vehicles keep the repository/source order — Phase 4 adds no sorting (no confirmed rule).
 * `headingLevel` keeps the heading outline valid for the page the list sits on.
 */
export function InventoryList({
  result,
  headingLevel,
  locale,
}: {
  result: InventoryListResult;
  headingLevel: 2 | 3;
  locale: Locale;
}) {
  const t = messages(locale);
  switch (result.kind) {
    case "ok":
      return (
        <ul className="inventory" aria-label={t.availableCarsLabel}>
          {result.vehicles.map((vehicle, index) => (
            <li key={vehicle.id}>
              <VehicleCard vehicle={vehicle} headingLevel={headingLevel} locale={locale} eagerCover={index === 0} />
            </li>
          ))}
        </ul>
      );
    case "empty":
      return (
        <section className="notice" role="status">
          <h2 className="notice-title">{t.emptyTitle}</h2>
          <p>{t.emptyText}</p>
        </section>
      );
    case "unavailable":
      return <InventoryUnavailable locale={locale} />;
    default: {
      const unhandled: never = result;
      return unhandled;
    }
  }
}
