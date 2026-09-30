import Link from "next/link";

import type { Vehicle } from "@/domain/vehicle";
import { localizedPath, type Locale } from "@/i18n/locales";
import { FactLine } from "./fact-line";
import { formatPriceAed, keyFacts, makeYearLine, modelLine } from "./format";
import { SoldBadge } from "./sold-badge";

/**
 * Listing card, no media: listings make 0 Drive calls, so there is no image box at all (never a
 * placeholder). A media frame is added above the eyebrow only once listing media is approved.
 *
 * `prefetch={false}` on the VDP link: `/cars/[id]` has no loading boundary (real 404 status), so
 * the default prefetch would render every visible car's VDP in the background — including its
 * Drive media lookup. Listings must make 0 Drive calls; the VDP loads on navigation.
 */
export function VehicleCard({
  vehicle,
  headingLevel,
  locale,
}: {
  vehicle: Vehicle;
  headingLevel: 2 | 3;
  locale: Locale;
}) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const model = modelLine(vehicle);
  return (
    <article className="card">
      {/* Visual eyebrow; the heading below carries the full title for assistive tech. */}
      <p className="card-eyebrow label" aria-hidden="true">
        <bdi>{makeYearLine(vehicle)}</bdi>
      </p>
      <Heading className="card-title">
        <Link className="card-link" href={localizedPath(locale, { kind: "vehicle", id: vehicle.id })} prefetch={false}>
          {/* Sheet values in their own direction (bidi isolate) inside Arabic text. */}
          <bdi>
            <span className="visually-hidden">
              {vehicle.year} {vehicle.make}
            </span>{" "}
            {model}
          </bdi>
        </Link>
      </Heading>
      {vehicle.status === "sold" ? <SoldBadge locale={locale} /> : null}
      {vehicle.status === "available" && vehicle.priceAed !== null ? (
        <p className="card-price figure">
          <bdi>{formatPriceAed(vehicle.priceAed, locale)}</bdi>
        </p>
      ) : null}
      <FactLine facts={keyFacts(vehicle, locale)} className="card-facts" />
    </article>
  );
}
