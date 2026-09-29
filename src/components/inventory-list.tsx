import type { InventoryListResult } from "@/domain/inventory-result";
import { InventoryUnavailable } from "./inventory-unavailable";
import { VehicleCard } from "./vehicle-card";

/**
 * Renders every list state explicitly: ok, empty, unavailable.
 * `headingLevel` keeps the heading outline valid for the page the list sits on.
 */
export function InventoryList({
  result,
  headingLevel,
}: {
  result: InventoryListResult;
  headingLevel: 2 | 3;
}) {
  switch (result.kind) {
    case "ok":
      return (
        <ul className="inventory" aria-label="Available cars">
          {result.vehicles.map((vehicle) => (
            <li key={vehicle.id}>
              <VehicleCard vehicle={vehicle} headingLevel={headingLevel} />
            </li>
          ))}
        </ul>
      );
    case "empty":
      return (
        <section className="notice" role="status">
          <h2>No cars are listed right now</h2>
          <p>Please check back later.</p>
        </section>
      );
    case "unavailable":
      return <InventoryUnavailable />;
    default: {
      const unhandled: never = result;
      return unhandled;
    }
  }
}
