import Image from "next/image";

import { vehicleImages, type VehicleMedia } from "@/domain/vehicle-media";

/**
 * Minimal, unstyled VDP photo list (visual gallery design is Phase 4).
 *
 * - Images only; videos have no public delivery path yet and are not rendered.
 * - Order is the technical fallback order; nothing here marks an image as the cover.
 * - No photos → neutral "Photos unavailable". Never a stock, AI-generated or substitute image of a car.
 * - Dimensions are not in the public model, so each image sits in a fixed-ratio frame
 *   (`object-fit: contain`): no layout shift and no cropping of the source.
 */
export function VehicleGallery({ media, title }: { media: readonly VehicleMedia[]; title: string }) {
  const images = vehicleImages(media);

  return (
    <section aria-labelledby="vehicle-photos-heading">
      <h2 id="vehicle-photos-heading">Photos</h2>
      {images.length === 0 ? (
        <p className="media-unavailable">Photos unavailable</p>
      ) : (
        <ul className="gallery">
          {images.map((image, index) => (
            <li key={image.id} className="gallery-frame">
              <Image
                src={image.src}
                alt={`${title}, photo ${index + 1} of ${images.length}`}
                fill
                sizes="(max-width: 60rem) 100vw, 58rem"
                loading={index === 0 ? "eager" : "lazy"}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
