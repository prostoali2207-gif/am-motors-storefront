import Link from "next/link";

import type { Vehicle } from "@/domain/vehicle";
import { vehicleTitle } from "@/domain/vehicle";
import { vehicleImages } from "@/domain/vehicle-media";
import { localizedPath, type Locale } from "@/i18n/locales";
import { messages } from "@/i18n/messages";
import { displayVehicleValue } from "@/i18n/vehicle-values";
import { FactLine } from "./fact-line";
import { formatMileageKm, formatPriceAed, keyFacts, makeYearLine, modelLine } from "./format";
import { SoldBadge } from "./sold-badge";
import { VehicleActions } from "./vehicle-actions";
import { VehicleGallery } from "./vehicle-gallery";

type Fact = { label: string; value: string | null };

/**
 * Only public-model fields, fixed order; empty values are omitted, never filled in.
 * Categorical values (regional spec, transmission, fuel, drivetrain) use the approved display
 * dictionary; everything else — engine, colour, year, ID — is shown exactly as in the Sheet.
 */
function specification(vehicle: Vehicle, locale: Locale): Fact[] {
  const label = messages(locale).spec;
  return [
    { label: label.mileage, value: vehicle.mileageKm === null ? null : formatMileageKm(vehicle.mileageKm, locale) },
    { label: label.regionalSpec, value: displayVehicleValue("regionalSpec", vehicle.regionalSpec, locale) },
    { label: label.transmission, value: displayVehicleValue("transmission", vehicle.transmission, locale) },
    { label: label.fuel, value: displayVehicleValue("fuel", vehicle.fuel, locale) },
    { label: label.engine, value: vehicle.engine },
    { label: label.drivetrain, value: displayVehicleValue("drivetrain", vehicle.drivetrain, locale) },
    { label: label.year, value: String(vehicle.year) },
    { label: label.colour, value: vehicle.color },
    { label: label.reference, value: vehicle.id },
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
 * `locale` selects the interface language; RTL mirroring comes from `dir` on <html> and logical CSS.
 */
export function VehicleDetail({
  vehicle,
  locale,
  serverOrigin = null,
}: {
  vehicle: Vehicle;
  locale: Locale;
  serverOrigin?: string | null;
}) {
  const t = messages(locale);
  const specRows = specification(vehicle, locale).filter(
    (fact): fact is { label: string; value: string } => fact.value !== null && fact.value.trim() !== "",
  );
  const title = vehicleTitle(vehicle);
  const sold = vehicle.status === "sold";
  const hasPhotos = vehicleImages(vehicle.media).length > 0;

  return (
    <article className="vehicle">
      <p className="back-link">
        <Link className="text-link" href={localizedPath(locale, { kind: "cars" })}>
          {sold ? t.seeCarsInStock : t.allCars}
        </Link>
      </p>

      <div className="vehicle-main">
        {hasPhotos ? <VehicleGallery media={vehicle.media} title={title} part="lead" locale={locale} /> : null}

        <header className="vehicle-heading">
          <p className="label vehicle-eyebrow" aria-hidden="true">
            <bdi>{makeYearLine(vehicle)}</bdi>
          </p>
          <h1 className="vehicle-title">
            <bdi>
              <span className="visually-hidden">
                {vehicle.year} {vehicle.make}
              </span>{" "}
              {modelLine(vehicle)}
            </bdi>
          </h1>
          {sold ? (
            <div className="vehicle-sold">
              <SoldBadge locale={locale} />
              <p>{t.soldNotice}</p>
            </div>
          ) : null}
          {/* Whether sold cars show their price is an open business question: hidden until decided. */}
          {!sold && vehicle.priceAed !== null ? (
            <p className="vehicle-price figure">
              <bdi>{formatPriceAed(vehicle.priceAed, locale)}</bdi>
            </p>
          ) : null}
          <FactLine facts={keyFacts(vehicle, locale)} className="vehicle-facts" />
        </header>

        {hasPhotos ? (
          <VehicleGallery media={vehicle.media} title={title} part="rest" locale={locale} />
        ) : (
          <VehicleGallery media={vehicle.media} title={title} locale={locale} />
        )}
      </div>

      <div className="vehicle-panel">
        {sold ? null : <VehicleActions vehicle={vehicle} serverOrigin={serverOrigin} locale={locale} />}

        {specRows.length > 0 ? (
          <section className="vehicle-spec" aria-labelledby="vehicle-spec-heading">
            <h2 id="vehicle-spec-heading" className="label spec-heading">
              {t.specHeading}
            </h2>
            <dl className="spec">
              {specRows.map((fact) => (
                <div key={fact.label} className="spec-row">
                  <dt>{fact.label}</dt>
                  <dd className="figure">
                    <bdi>{fact.value}</bdi>
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ) : null}
      </div>
    </article>
  );
}
