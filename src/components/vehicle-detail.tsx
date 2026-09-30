import Link from "next/link";

import type { Vehicle } from "@/domain/vehicle";
import { vehicleTitle } from "@/domain/vehicle";
import { vehicleImages } from "@/domain/vehicle-media";
import { FactLine } from "./fact-line";
import { formatMileageKm, formatPriceAed, keyFacts, makeYearLine, modelLine } from "./format";
import { SoldBadge } from "./sold-badge";
import { VehicleActions } from "./vehicle-actions";
import { VehicleGallery } from "./vehicle-gallery";

type Fact = { label: string; value: string | null };

/**
 * Only public-model fields, fixed order; empty values are omitted, never filled in.
 * Sheet text is shown verbatim (English display labels are open question 6).
 */
function specification(vehicle: Vehicle): Fact[] {
  return [
    { label: "Mileage", value: vehicle.mileageKm === null ? null : formatMileageKm(vehicle.mileageKm) },
    { label: "Regional spec", value: vehicle.regionalSpec },
    { label: "Transmission", value: vehicle.transmission },
    { label: "Fuel", value: vehicle.fuel },
    { label: "Engine", value: vehicle.engine },
    { label: "Drivetrain", value: vehicle.drivetrain },
    { label: "Year", value: String(vehicle.year) },
    { label: "Colour", value: vehicle.color },
    { label: "Reference", value: vehicle.id },
  ];
}

/**
 * VDP body. Available vehicles get the conversion actions (WhatsApp, request a viewing / test
 * drive); sold vehicles get none.
 *
 * Layout: `vehicle-main` (photos, title block) and `vehicle-panel` (actions, specification).
 * Desktop: two columns, the panel on the right. Mobile: both wrappers dissolve into one column
 * ordered title block → actions → photos line → specification (globals.css).
 *
 * `serverOrigin` is the request origin for the VDP URL in WhatsApp messages (null if unknown).
 */
export function VehicleDetail({ vehicle, serverOrigin = null }: { vehicle: Vehicle; serverOrigin?: string | null }) {
  const specRows = specification(vehicle).filter(
    (fact): fact is { label: string; value: string } => fact.value !== null && fact.value.trim() !== "",
  );
  const title = vehicleTitle(vehicle);
  const sold = vehicle.status === "sold";
  const hasPhotos = vehicleImages(vehicle.media).length > 0;

  return (
    <article className="vehicle">
      <p className="back-link">
        <Link className="text-link" href="/cars">
          {sold ? "See cars in stock" : "All cars"}
        </Link>
      </p>

      <div className="vehicle-main">
        {hasPhotos ? <VehicleGallery media={vehicle.media} title={title} part="lead" /> : null}

        <header className="vehicle-heading">
          <p className="label vehicle-eyebrow" aria-hidden="true">
            {makeYearLine(vehicle)}
          </p>
          <h1 className="vehicle-title">
            <span className="visually-hidden">
              {vehicle.year} {vehicle.make}
            </span>{" "}
            {modelLine(vehicle)}
          </h1>
          {sold ? (
            <div className="vehicle-sold">
              <SoldBadge />
              <p>This car has been sold.</p>
            </div>
          ) : null}
          {/* Whether sold cars show their price is an open business question: hidden until decided. */}
          {!sold && vehicle.priceAed !== null ? (
            <p className="vehicle-price figure">{formatPriceAed(vehicle.priceAed)}</p>
          ) : null}
          <FactLine facts={keyFacts(vehicle)} className="vehicle-facts" />
        </header>

        {hasPhotos ? (
          <VehicleGallery media={vehicle.media} title={title} part="rest" />
        ) : (
          <VehicleGallery media={vehicle.media} title={title} />
        )}
      </div>

      <div className="vehicle-panel">
        {sold ? null : <VehicleActions vehicle={vehicle} serverOrigin={serverOrigin} />}

        {specRows.length > 0 ? (
          <section className="vehicle-spec" aria-labelledby="vehicle-spec-heading">
            <h2 id="vehicle-spec-heading" className="label spec-heading">
              Specification
            </h2>
            <dl className="spec">
              {specRows.map((fact) => (
                <div key={fact.label} className="spec-row">
                  <dt>{fact.label}</dt>
                  <dd className="figure">{fact.value}</dd>
                </div>
              ))}
            </dl>
          </section>
        ) : null}
      </div>
    </article>
  );
}
