import Link from "next/link";

import type { Vehicle } from "@/domain/vehicle";
import { vehicleTitle } from "@/domain/vehicle";
import { formatMileageKm, formatPriceAed } from "./format";
import { SoldBadge } from "./sold-badge";
import { VehicleGallery } from "./vehicle-gallery";

type Fact = { label: string; value: string | null };

/** Only public-model fields; empty values are omitted, never filled in. */
function facts(vehicle: Vehicle): Fact[] {
  return [
    { label: "Year", value: String(vehicle.year) },
    { label: "Mileage", value: vehicle.mileageKm === null ? null : formatMileageKm(vehicle.mileageKm) },
    { label: "Regional spec", value: vehicle.regionalSpec },
    { label: "Engine", value: vehicle.engine },
    { label: "Fuel", value: vehicle.fuel },
    { label: "Transmission", value: vehicle.transmission },
    { label: "Drivetrain", value: vehicle.drivetrain },
    { label: "Color", value: vehicle.color },
  ];
}

/**
 * Minimal VDP body. Conversion actions (WhatsApp, request a viewing / test drive) arrive in
 * Phase 5 once the business confirms contact details; sold vehicles never get them.
 */
export function VehicleDetail({ vehicle }: { vehicle: Vehicle }) {
  const visibleFacts = facts(vehicle).filter(
    (fact): fact is { label: string; value: string } => fact.value !== null && fact.value !== "",
  );

  const title = vehicleTitle(vehicle);

  return (
    <article className="vehicle">
      <h1>{title}</h1>
      {vehicle.status === "sold" ? (
        <>
          <SoldBadge />
          <p>This car has been sold.</p>
        </>
      ) : null}

      {/* Whether sold cars show their price is an open business question: hidden until decided. */}
      {vehicle.status === "available" && vehicle.priceAed !== null ? (
        <p className="price">{formatPriceAed(vehicle.priceAed)}</p>
      ) : null}

      <VehicleGallery media={vehicle.media} title={title} />

      {visibleFacts.length > 0 ? (
        <section aria-labelledby="vehicle-facts-heading">
          <h2 id="vehicle-facts-heading">Details</h2>
          <dl className="facts">
            {visibleFacts.map((fact) => (
              <div key={fact.label}>
                <dt>{fact.label}</dt>
                <dd>{fact.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      <p>
        <Link className="text-link" href="/cars">
          {vehicle.status === "sold" ? "See available cars" : "All cars"}
        </Link>
      </p>
    </article>
  );
}
