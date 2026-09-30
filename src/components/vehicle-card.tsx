import Link from "next/link";

import type { Vehicle } from "@/domain/vehicle";
import { vehicleTitle } from "@/domain/vehicle";
import { vehiclePath } from "@/domain/vehicle-id";
import { formatMileageKm, formatPriceAed } from "./format";
import { SoldBadge } from "./sold-badge";

/**
 * `prefetch={false}` on the VDP link: `/cars/[id]` has no loading boundary (real 404 status), so
 * the default prefetch would render every visible car's VDP in the background — including its
 * Drive media lookup. Listings must make 0 Drive calls; the VDP loads on navigation.
 */
export function VehicleCard({ vehicle, headingLevel }: { vehicle: Vehicle; headingLevel: 2 | 3 }) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <article className="card">
      <Heading className="card-title">
        <Link href={vehiclePath(vehicle.id)} prefetch={false}>{vehicleTitle(vehicle)}</Link>
      </Heading>
      {vehicle.status === "sold" ? <SoldBadge /> : null}
      <ul className="card-facts">
        {vehicle.status === "available" && vehicle.priceAed !== null ? <li>{formatPriceAed(vehicle.priceAed)}</li> : null}
        {vehicle.mileageKm !== null ? <li>{formatMileageKm(vehicle.mileageKm)}</li> : null}
        {vehicle.regionalSpec !== null ? <li>{vehicle.regionalSpec}</li> : null}
      </ul>
    </article>
  );
}
