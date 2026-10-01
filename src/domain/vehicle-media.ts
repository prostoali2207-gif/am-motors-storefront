/**
 * Public vehicle media model — deliberately narrow.
 *
 * The only authoritative media source is the Google Drive folder linked in the Sheet column
 * `Ссылка на фото/видео`; only images placed in its `Website/` child folder are published. That link, the folder ID, Drive file IDs, file names, owners,
 * permissions and EXIF/GPS never appear here: `id` is an opaque hash of the Drive file ID, and
 * `src` points at the site's own media route, which re-encodes the image without metadata.
 *
 * Order follows the confirmed filename rule (`01.*` = cover, see
 * `adapters/google-drive-media/ordering.ts`).
 *
 * An empty array means "media unavailable" for any reason (no link, invalid link, inaccessible
 * folder, no/duplicate `Website/` folder, empty or unsupported-only `Website/`, source error,
 * media source not enabled). The reason
 * stays server-side; the UI shows a neutral state.
 */

export interface VehicleImage {
  /** Opaque, stable ID derived from the Drive file ID (not reversible). */
  readonly id: string;
  readonly type: "image";
  /** Same-origin path of the sanitized image (`/media/…`). Never a Drive URL. */
  readonly src: string;
}

/**
 * Reserved: video publishing is OFF (confirmed 2026-10-01). The Drive adapter never emits this;
 * no URL exists and the UI does not render videos.
 */
export interface VehicleVideo {
  readonly id: string;
  readonly type: "video";
}

export type VehicleMedia = VehicleImage | VehicleVideo;

export function vehicleImages(media: readonly VehicleMedia[]): VehicleImage[] {
  return media.filter((item): item is VehicleImage => item.type === "image");
}
