import Image from "next/image";
import Link from "next/link";

import type { Vehicle } from "@/domain/vehicle";
import { vehicleImages } from "@/domain/vehicle-media";
import { localizedPath, type Locale } from "@/i18n/locales";
import { FactLine } from "./fact-line";
import { formatPriceAed, keyFacts, makeYearLine, modelLine } from "./format";
import { SoldBadge } from "./sold-badge";

/**
 * Listing card.
 *
 * - Cover: the vehicle's first approved `Website/` image (`01.*`), above the eyebrow, in the
 *   provisional `--media-ratio` frame with `object-fit: contain` (whole car, no crop). Only one
 *   image — no carousel. No approved image → no frame at all: the text-only card, never an empty
 *   box or stand-in image.
 * - The cover has empty `alt`: the card heading right below already names the car, so a
 *   description would only repeat it for screen readers. The stretched title link makes the
 *   photo part of the card's single tap target.
 * - `eagerCover` for the first card only (the likely mobile LCP); the rest load lazily.
 *
 * `prefetch={false}` on the VDP link: `/cars/[id]` has no loading boundary (real 404 status), so
 * the default prefetch would render every visible car's VDP in the background — including its
 * full Drive media lookup. The VDP loads on navigation.
 */
export function VehicleCard({
  vehicle,
  headingLevel,
  locale,
  eagerCover = false,
}: {
  vehicle: Vehicle;
  headingLevel: 2 | 3;
  locale: Locale;
  eagerCover?: boolean;
}) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const model = modelLine(vehicle);
  const cover = vehicleImages(vehicle.media)[0];
  return (
    <article className="card">
      {cover ? (
        <div className="card-media">
          <Image
            src={cover.src}
            alt=""
            fill
            sizes="(min-width: 80rem) 25rem, (min-width: 64rem) 31vw, (min-width: 40rem) 48vw, 100vw"
            loading={eagerCover ? "eager" : "lazy"}
            fetchPriority={eagerCover ? "high" : undefined}
          />
        </div>
      ) : null}
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
