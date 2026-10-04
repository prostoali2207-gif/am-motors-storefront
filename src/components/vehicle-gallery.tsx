import { vehicleImages, type VehicleMedia } from "@/domain/vehicle-media";
import { LOCALE_CONFIG, type Locale } from "@/i18n/locales";
import { messages } from "@/i18n/messages";
import { PhotoViewer, type ViewerPhoto } from "./photo-viewer";

/**
 * VDP photos.
 *
 * - Images only (from the vehicle's `Website/` Drive folder); videos are never rendered.
 * - Order follows the confirmed filename rule; the first image (`01.*`) is the cover and the
 *   photo shown first.
 * - No photos → one neutral "Photos unavailable" line. Never a stock, AI-generated or substitute
 *   image of a car, and no empty image box.
 * - Photos → one interactive viewer (`PhotoViewer`): a single photo viewport, swipe / previous /
 *   next, counter and thumbnail rail when there is more than one photo, full-screen view on tap.
 *   Only same-origin `/media/…` paths and pre-built strings cross into the client island.
 * - Frames use the PROVISIONAL `--media-ratio` token (globals.css), not a confirmed photo
 *   standard; `object-fit: contain` so nothing is cropped while the framing convention is unknown.
 */
export function VehicleGallery({
  media,
  title,
  locale,
}: {
  media: readonly VehicleMedia[];
  title: string;
  locale: Locale;
}) {
  const t = messages(locale);
  const images = vehicleImages(media);
  const count = images.length;
  const photos: ViewerPhoto[] = images.map((image, index) => ({
    id: image.id,
    src: image.src,
    alt: t.photoAlt(title, index + 1, count),
    position: t.photoPosition(index + 1, count),
  }));

  return (
    <section className="vehicle-photos" aria-labelledby="vehicle-photos-heading">
      <h2 id="vehicle-photos-heading" className="visually-hidden">
        {t.photosHeading}
      </h2>
      {count === 0 ? (
        <p className="media-unavailable">{t.photosUnavailable}</p>
      ) : (
        <PhotoViewer
          photos={photos}
          dir={LOCALE_CONFIG[locale].dir}
          labels={{
            heading: t.photosHeading,
            previous: t.previousPhoto,
            next: t.nextPhoto,
            open: t.openPhotosFullscreen,
            close: t.closePhotos,
            thumbnails: t.photoThumbnails,
          }}
        />
      )}
    </section>
  );
}
