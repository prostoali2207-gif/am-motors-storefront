import { DRIVE_FOLDER_MIME, DriveSourceError, type DriveChild, type DriveReader } from "./drive-client";
import type { DriveFolderRef } from "./folder-link";
import { sortTechnicalFallback } from "./ordering";

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
  /** Folder has no direct children at all. */
  | "empty"
  /** Children exist, but none is a supported image or video (docs, subfolders, HEIC, …). */
  | "no-supported-media"
  /** Transient source problem (network, 5xx, quota, auth). */
  | "source-error";

export type MediaKind = "image" | "video";

/** Internal (server-only) record of a publishable file. Never sent to the client. */
export interface MediaFile {
  /** Drive file ID — the identity. File names are not unique and are not kept. */
  readonly fileId: string;
  readonly kind: MediaKind;
  /** Content version (md5, else Drive version/createdTime) for cache-busting URLs. */
  readonly contentVersion: string;
}

export interface FolderMediaCounts {
  readonly images: number;
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
  /** Ordered by the technical fallback order. Empty unless `state === "ok"`. */
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
 * Classifies the direct children of one folder: supported images and videos are kept, in the
 * technical fallback order; folders (not traversed), shortcuts (could point outside the
 * authoritative folder), Google Docs, PDFs and other types are excluded and only counted.
 */
export function classifyChildren(children: readonly DriveChild[]): FolderMedia {
  if (children.length === 0) return unavailableMedia("empty");

  let subfolders = 0;
  let unsupported = 0;
  let oversized = 0;
  let duplicates = 0;
  const candidates: (DriveChild & { kind: MediaKind })[] = [];

  for (const child of children) {
    const kind = classifyMime(child.mimeType);
    if (kind === "folder") subfolders += 1;
    else if (kind === "unsupported") unsupported += 1;
    else if (kind === "image" && (child.size === null || child.size > MAX_IMAGE_SOURCE_BYTES)) oversized += 1;
    else candidates.push({ ...child, kind });
  }

  const seenContent = new Set<string>();
  const files: MediaFile[] = [];
  for (const child of sortTechnicalFallback(candidates)) {
    if (child.md5Checksum !== null) {
      const key = `${child.kind}:${child.md5Checksum}`;
      if (seenContent.has(key)) {
        duplicates += 1;
        continue;
      }
      seenContent.add(key);
    }
    files.push({
      fileId: child.id,
      kind: child.kind,
      contentVersion: child.md5Checksum ?? `v${child.version ?? ""}:${child.createdTime ?? ""}`,
    });
  }

  const counts: FolderMediaCounts = {
    images: files.filter((f) => f.kind === "image").length,
    videos: files.filter((f) => f.kind === "video").length,
    subfolders,
    unsupported,
    duplicates,
    oversized,
  };
  return { state: files.length > 0 ? "ok" : "no-supported-media", files, counts };
}

/**
 * Resolves the media of ONE vehicle's folder: verifies it is an accessible, non-trashed folder,
 * then lists its direct children. Permanent problems become a state; transient source errors
 * are thrown (`DriveSourceError` with `transient: true`) so callers do not cache them.
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
    return classifyChildren(await reader.listChildren(ref.folderId));
  } catch (error) {
    if (error instanceof DriveSourceError && !error.transient) {
      return unavailableMedia(error.code === "http-404" ? "inaccessible" : "source-error");
    }
    throw error;
  }
}
