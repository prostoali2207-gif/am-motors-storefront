import { createHash } from "node:crypto";

import type { VehicleMedia } from "@/domain/vehicle-media";
import type { MediaFile } from "./folder-media";

/**
 * Maps internal Drive media records to the public `VehicleMedia` model.
 *
 * - `id`: SHA-256 of the Drive file ID (namespaced), base64url, 128 bits. Stable while the file
 *   exists; not reversible (Drive IDs are long random tokens), so a link-shared Drive file can
 *   not be reached from it.
 * - `src`: `/media/<vehicle ID>/<id>/<rev>` on this site. `rev` changes when the file content
 *   changes, so responses can be cached long without serving replaced photos.
 * - Videos carry no URL: delivery is pending a decision.
 */
export function toVehicleMedia(vehicleId: string, files: readonly MediaFile[]): VehicleMedia[] {
  return files.map((file) => {
    const id = publicMediaId(file.fileId);
    return file.kind === "image"
      ? { id, type: "image", src: mediaPath(vehicleId, id, mediaRevision(file.contentVersion)) }
      : { id, type: "video" };
  });
}

export function publicMediaId(fileId: string): string {
  return digest(`am-motors:drive-file:v1:${fileId}`, 22);
}

export function mediaRevision(contentVersion: string): string {
  return digest(`am-motors:content:v1:${contentVersion}`, 12);
}

export function mediaPath(vehicleId: string, mediaId: string, revision: string): string {
  return `/media/${encodeURIComponent(vehicleId)}/${mediaId}/${revision}`;
}

/** Shape check for route params before any lookup. */
export function isPublicMediaToken(value: string, length: 22 | 12): boolean {
  return value.length === length && /^[A-Za-z0-9_-]+$/.test(value);
}

function digest(input: string, length: number): string {
  return createHash("sha256").update(input).digest("base64url").slice(0, length);
}
