import Link from "next/link";

import type { Vehicle } from "@/domain/vehicle";
import { vehiclePath } from "@/domain/vehicle-id";
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
export function VehicleCard({ vehicle, headingLevel }: { vehicle: Vehicle; headingLevel: 2 | 3 }) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const model = modelLine(vehicle);
  return (
    <article className="card">
      {/* Visual eyebrow; the heading below carries the full title for assistive tech. */}
      <p className="card-eyebrow label" aria-hidden="true">
        {makeYearLine(vehicle)}
      </p>
      <Heading className="card-title">
        <Link className="card-link" href={vehiclePath(vehicle.id)} prefetch={false}>
          <span className="visually-hidden">
            {vehicle.year} {vehicle.make}
          </span>{" "}
          {model}
        </Link>
      </Heading>
      {vehicle.status === "sold" ? <SoldBadge /> : null}
      {vehicle.status === "available" && vehicle.priceAed !== null ? (
        <p className="card-price figure">{formatPriceAed(vehicle.priceAed)}</p>
      ) : null}
      <FactLine facts={keyFacts(vehicle)} className="card-facts" />
    </article>
  );
}
