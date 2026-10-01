import type { MediaImageResult } from "@/domain/inventory-result";
import type { VehicleMedia } from "@/domain/vehicle-media";
import { DriveSourceError, type DriveReader } from "./drive-client";
import type { DriveFolderRef } from "./folder-link";
import { MAX_IMAGE_SOURCE_BYTES, resolveFolderMedia, unavailableMedia, type FolderMedia } from "./folder-media";
import type { SanitizedImage } from "./image-pipeline";
import { mediaRevision, publicMediaId, toVehicleMedia } from "./public-media";

/** Resolves and delivers the media of individual vehicles. Never throws. */
export interface VehicleMediaService {
  /** Public media for one vehicle; `[]` on any problem (that vehicle only). */
  mediaFor(vehicleId: string, ref: DriveFolderRef): Promise<VehicleMedia[]>;
  /**
   * Sanitized image bytes, only if `mediaId`/`revision` is a current image of THIS vehicle's
   * folder. Anything else is `not-found`: the route can never fetch arbitrary Drive files.
   */
  imageFor(vehicleId: string, ref: DriveFolderRef, mediaId: string, revision: string): Promise<MediaImageResult>;
}

export interface MediaServiceOptions {
  readonly reader: DriveReader;
  /** Folder listing, usually wrapped in a cache. Transient errors must be thrown, not cached. */
  readonly resolveFolder?: (folderId: string) => Promise<FolderMedia>;
  readonly sanitize: (bytes: Uint8Array) => Promise<SanitizedImage>;
  /** After a transient failure, a folder is not retried for this long (per process). */
  readonly retryAfterMs?: number;
  readonly now?: () => number;
  readonly log?: (message: string) => void;
}

const PREFIX = "[media:drive]";

export function createMediaService(options: MediaServiceOptions): VehicleMediaService {
  const resolveFolder =
    options.resolveFolder ?? ((folderId: string) => resolveFolderMedia(options.reader, { kind: "folder", folderId }));
  const retryAfterMs = options.retryAfterMs ?? 30_000;
  const now = options.now ?? Date.now;
  const log = options.log ?? ((message: string) => console.warn(message));

  const backoffUntil = new Map<string, number>();
  const reported = new Set<string>();

  /** Logs a vehicle's non-ok state once per process. Vehicle IDs are public; nothing else is logged. */
  function report(vehicleId: string, media: FolderMedia, code?: string) {
    const key = `${vehicleId}|${media.state}|${code ?? ""}`;
    if (reported.has(key)) return;
    reported.add(key);
    const c = media.counts;
    log(
      `${PREFIX} vehicle ${vehicleId}: ${media.state}${code ? ` (${code})` : ""}; ` +
        `Website/ images ${c.images}, ignored videos ${c.videos}, subfolders ${c.subfolders}, ` +
        `unsupported ${c.unsupported}, duplicates ${c.duplicates}, oversized ${c.oversized}`,
    );
  }

  async function folderMedia(vehicleId: string, ref: DriveFolderRef): Promise<FolderMedia> {
    if (ref.kind !== "folder") {
      const media = unavailableMedia(ref.kind === "missing" ? "missing-link" : "invalid-link");
      report(vehicleId, media);
      return media;
    }
    const blockedUntil = backoffUntil.get(ref.folderId);
    if (blockedUntil !== undefined && now() < blockedUntil) return unavailableMedia("source-error");

    try {
      const media = await resolveFolder(ref.folderId);
      backoffUntil.delete(ref.folderId);
      if (media.state !== "ok" || media.counts.videos + media.counts.unsupported + media.counts.oversized + media.counts.subfolders > 0) {
        report(vehicleId, media);
      }
      return media;
    } catch (error) {
      backoffUntil.set(ref.folderId, now() + retryAfterMs);
      const media = unavailableMedia("source-error");
      report(vehicleId, media, errorCode(error));
      return media;
    }
  }

  return {
    async mediaFor(vehicleId, ref) {
      const media = await folderMedia(vehicleId, ref);
      return media.state === "ok" ? toVehicleMedia(vehicleId, media.files) : [];
    },

    async imageFor(vehicleId, ref, mediaId, revision) {
      const media = await folderMedia(vehicleId, ref);
      if (media.state === "source-error") return { kind: "unavailable", reason: "source-error" };

      const file = media.files.find(
        (f) =>
          publicMediaId(f.fileId) === mediaId &&
          mediaRevision(f.contentVersion) === revision,
      );
      if (!file) return { kind: "not-found" };

      try {
        const source = await options.reader.download(file.fileId, MAX_IMAGE_SOURCE_BYTES);
        const image = await options.sanitize(source);
        return { kind: "ok", bytes: image.bytes, contentType: image.contentType };
      } catch (error) {
        log(`${PREFIX} vehicle ${vehicleId}: image delivery failed (${errorCode(error)})`);
        if (error instanceof DriveSourceError && error.transient) {
          return { kind: "unavailable", reason: "source-error" };
        }
        return { kind: "not-found" };
      }
    },
  };
}

function errorCode(error: unknown): string {
  if (error instanceof DriveSourceError) return error.code;
  if (error instanceof Error && "code" in error && typeof error.code === "string") return error.code;
  return error instanceof Error ? error.name : "UnknownError";
}
