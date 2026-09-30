import Image from "next/image";

import { vehicleImages, type VehicleMedia } from "@/domain/vehicle-media";

/**
 * VDP photos — deliberately simple until real approved website photos exist.
 *
 * - Images only; videos have no public delivery path yet and are not rendered.
 * - Order is the technical fallback order; nothing here marks an image as the cover.
 * - No photos → one neutral "Photos unavailable" line. Never a stock, AI-generated or substitute
 *   image of a car, and no empty image box.
 * - Frames use the PROVISIONAL `--media-ratio` token (globals.css), not a confirmed photo
 *   standard; `object-fit: contain` so nothing is cropped while the framing convention is unknown.
 * - No lightbox, swipe or full-screen viewer yet: gallery interaction is designed and tested once
 *   approved photos exist.
 *
 * `part` lets the VDP keep its title and price near the top: the first image leads the page
 * ("lead"), the remaining ones follow the summary as a plain sequence ("rest").
 */
export function VehicleGallery({
  media,
  title,
  part = "all",
}: {
  media: readonly VehicleMedia[];
  title: string;
  part?: "all" | "lead" | "rest";
}) {
  const images = vehicleImages(media);
  const start = part === "rest" ? 1 : 0;
  const end = part === "lead" ? 1 : images.length;
  const shown = images.slice(start, end);

  if (part === "rest") {
    return shown.length === 0 ? null : (
      <ul className="gallery gallery-rest" aria-label="More photos">
        {shown.map((image, offset) => (
          <Frame key={image.id} src={image.src} index={start + offset} count={images.length} title={title} />
        ))}
      </ul>
    );
  }

  return (
    <section className="vehicle-photos" aria-labelledby="vehicle-photos-heading">
      <h2 id="vehicle-photos-heading" className="visually-hidden">
        Photos
      </h2>
      {images.length === 0 ? (
        <p className="media-unavailable">Photos unavailable</p>
      ) : (
        <ul className="gallery">
          {shown.map((image, offset) => (
            <Frame key={image.id} src={image.src} index={start + offset} count={images.length} title={title} />
          ))}
        </ul>
      )}
    </section>
  );
}

function Frame({ src, index, count, title }: { src: string; index: number; count: number; title: string }) {
  return (
    <li className="gallery-frame">
      <Image
        src={src}
        alt={`${title}, photo ${index + 1} of ${count}`}
        fill
        sizes="(min-width: 64rem) 46rem, 100vw"
        loading={index === 0 ? "eager" : "lazy"}
        fetchPriority={index === 0 ? "high" : undefined}
      />
    </li>
  );
}
