import { DRIVE_FOLDER_MIME, DriveSourceError, type DriveChild, type DriveReader } from "./drive-client";
import type { DriveFolderRef } from "./folder-link";
import { sortTechnicalFallback } from "./ordering";

/**
 * PUBLISHING RULE (confirmed 2026-10-01, docs/business-rules.md → "Website photos"):
 * the only publishable media of a vehicle are the direct children of exactly ONE direct child
 * folder named exactly `Website` inside the vehicle folder linked in `Ссылка на фото/видео`.
 * Placing an approved image into `Website/` is the human publishing action. Files in the
 * vehicle folder itself (raw shots, ad creatives, documents, videos) are never listed or
 * returned — there is no fallback.
 */
export const WEBSITE_FOLDER_NAME = "Website";

/**
 * Server-side media states of one vehicle. Distinguished for diagnostics only; the public model
 * collapses every state except `ok` into "media unavailable" (empty `media`).
 */
export type FolderMediaState =
  | "ok"
  | "missing-link"
  | "invalid-link"
  /** Drive 404: folder does not exist, or the server identity has no access to it. */
  | "inaccessible"
  | "not-a-folder"
  /** The vehicle folder has no child folder named exactly `Website`. */
  | "no-website-folder"
  /** More than one child folder is named `Website`: ambiguous, fail closed. */
  | "duplicate-website-folder"
  /** `Website/` has no direct children at all. */
  | "empty"
  /** `Website/` has children, but no supported image (videos, docs, subfolders, HEIC, …). */
  | "no-supported-media"
  /** Transient source problem (network, 5xx, quota, auth). */
  | "source-error";

/** Kinds recognised by MIME type. Only images are ever published; videos are counted only. */
export type MediaKind = "image" | "video";

/** Internal (server-only) record of a publishable image. Never sent to the client. */
export interface MediaFile {
  /** Drive file ID — the identity. File names are only used for ordering and are not kept. */
  readonly fileId: string;
  readonly kind: "image";
  /** Content version (md5, else Drive version/createdTime) for cache-busting URLs. */
  readonly contentVersion: string;
}

/** Counts describe the `Website/` folder only (never the vehicle root folder). */
export interface FolderMediaCounts {
  readonly images: number;
  /** Videos in `Website/` are ignored (video publishing is off). */
  readonly videos: number;
  readonly subfolders: number;
  readonly unsupported: number;
  /** Byte-identical copies (same md5Checksum) dropped after the first in order. */
  readonly duplicates: number;
  /** Supported images above the source size limit. */
  readonly oversized: number;
}

export interface FolderMedia {
  readonly state: FolderMediaState;
  /** `Website/` images in filename order (`01.*` first). Empty unless `state === "ok"`. */
  readonly files: readonly MediaFile[];
  readonly counts: FolderMediaCounts;
}

/**
 * Images the pipeline can decode and re-encode (sharp prebuilt binaries). HEIC/HEIF (HEVC) is
 * not decodable by the prebuilt libvips and GIF may be animated: both are treated as
 * unsupported for V1 rather than risking broken or un-sanitized output.
 */
export const SUPPORTED_IMAGE_TYPES: ReadonlySet<string> = new Set(["image/jpeg", "image/png", "image/webp"]);

/** Largest source image the pipeline will download (bytes). */
export const MAX_IMAGE_SOURCE_BYTES = 30 * 1024 * 1024;

const NO_COUNTS: FolderMediaCounts = {
  images: 0,
  videos: 0,
  subfolders: 0,
  unsupported: 0,
  duplicates: 0,
  oversized: 0,
};

export function unavailableMedia(state: Exclude<FolderMediaState, "ok">): FolderMedia {
  return { state, files: [], counts: NO_COUNTS };
}

export function classifyMime(mimeType: string): MediaKind | "folder" | "unsupported" {
  if (mimeType === DRIVE_FOLDER_MIME) return "folder";
  if (SUPPORTED_IMAGE_TYPES.has(mimeType)) return "image";
  if (mimeType.startsWith("video/")) return "video";
  return "unsupported";
}

/**
 * Classifies the direct children of the `Website/` folder: supported images (JPEG, PNG, WebP)
 * are kept in filename order (`01.*` = cover, see ./ordering.ts); videos are counted but never
 * returned; folders (not traversed), shortcuts (could point outside the authoritative folder),
 * Google Docs, PDFs, HEIC and other types are excluded and only counted. Byte-identical copies
 * (same md5) are kept once.
 */
export function classifyChildren(children: readonly DriveChild[]): FolderMedia {
  if (children.length === 0) return unavailableMedia("empty");

  let videos = 0;
  let subfolders = 0;
  let unsupported = 0;
  let oversized = 0;
  let duplicates = 0;
  const candidates: DriveChild[] = [];

  for (const child of children) {
    const kind = classifyMime(child.mimeType);
    if (kind === "folder") subfolders += 1;
    else if (kind === "video") videos += 1;
    else if (kind === "unsupported") unsupported += 1;
    else if (child.size === null || child.size > MAX_IMAGE_SOURCE_BYTES) oversized += 1;
    else candidates.push(child);
  }

  const seenContent = new Set<string>();
  const files: MediaFile[] = [];
  for (const child of sortTechnicalFallback(candidates)) {
    if (child.md5Checksum !== null) {
      if (seenContent.has(child.md5Checksum)) {
        duplicates += 1;
        continue;
      }
      seenContent.add(child.md5Checksum);
    }
    files.push({
      fileId: child.id,
      kind: "image",
      contentVersion: child.md5Checksum ?? `v${child.version ?? ""}:${child.createdTime ?? ""}`,
    });
  }

  const counts: FolderMediaCounts = { images: files.length, videos, subfolders, unsupported, duplicates, oversized };
  return { state: files.length > 0 ? "ok" : "no-supported-media", files, counts };
}

/**
 * Resolves the media of ONE vehicle: verifies the linked vehicle folder is an accessible,
 * non-trashed folder, finds exactly one direct child folder named exactly `Website` (only
 * folders are queried — files in the vehicle folder are never listed), then lists the direct
 * children of `Website/` only. Missing or duplicate `Website` folders fail closed. Permanent
 * problems become a state; transient source errors are thrown (`DriveSourceError` with
 * `transient: true`) so callers do not cache them.
 */
export async function resolveFolderMedia(reader: DriveReader, ref: DriveFolderRef): Promise<FolderMedia> {
  switch (ref.kind) {
    case "missing":
      return unavailableMedia("missing-link");
    case "invalid":
      return unavailableMedia("invalid-link");
    case "folder":
      break;
    default: {
      const unhandled: never = ref;
      return unhandled;
    }
  }

  try {
    const folder = await reader.getFolder(ref.folderId);
    if (folder.trashed) return unavailableMedia("inaccessible");
    if (folder.mimeType !== DRIVE_FOLDER_MIME) return unavailableMedia("not-a-folder");

    const websiteFolders = (await reader.listChildFolders(ref.folderId, WEBSITE_FOLDER_NAME)).filter(
      (child) => child.mimeType === DRIVE_FOLDER_MIME && child.name === WEBSITE_FOLDER_NAME,
    );
    if (websiteFolders.length === 0) return unavailableMedia("no-website-folder");
    if (websiteFolders.length > 1) return unavailableMedia("duplicate-website-folder");
    return classifyChildren(await reader.listChildren(websiteFolders[0].id));
  } catch (error) {
    if (error instanceof DriveSourceError && !error.transient) {
      return unavailableMedia(error.code === "http-404" ? "inaccessible" : "source-error");
    }
    throw error;
  }
}
