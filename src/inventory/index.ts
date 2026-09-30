import "server-only";

import { unstable_cache } from "next/cache";

import { createDriveReader, DRIVE_READONLY_SCOPE } from "@/adapters/google-drive-media/drive-client";
import { resolveFolderMedia } from "@/adapters/google-drive-media/folder-media";
import { sanitizeImage } from "@/adapters/google-drive-media/image-pipeline";
import { createMediaService, type VehicleMediaService } from "@/adapters/google-drive-media/media-service";
import { createAccessTokenProvider } from "@/adapters/google-sheets/auth";
import { loadInventorySnapshot } from "@/adapters/google-sheets/loader";
import { createSheetsReader, SHEETS_READONLY_SCOPE } from "@/adapters/google-sheets/sheets-client";
import { GoogleSheetsInventoryRepository } from "@/adapters/google-sheets/sheets-repository";
import { UnavailableInventoryRepository } from "@/adapters/unavailable/unavailable-repository";
import { readInventorySourceConfig, type InventorySourceConfig } from "@/lib/env";
import { createSnapshotReader, INVENTORY_CACHE_TAG, INVENTORY_REVALIDATE_SECONDS } from "./freshness";
import type { InventoryRepository } from "./repository";

/** Bump when the cached snapshot shape or mapping rules change, to drop old cache entries. */
const SNAPSHOT_CACHE_VERSION = "sheets-v2";
/** Bump when the cached folder listing shape or classification/ordering rules change. */
const MEDIA_CACHE_VERSION = "drive-media-v1";

/**
 * Folder listings (metadata only, never file bytes) are cached for 5 minutes, tag `media`.
 * Media changes (added/removed photos) therefore appear within ~5 minutes. Vehicle status
 * freshness is unaffected: it is governed by the Sheet snapshot (./freshness.ts).
 */
export const MEDIA_LISTING_REVALIDATE_SECONDS = 300;
export const MEDIA_CACHE_TAG = "media";

let memo: { key: string; repository: InventoryRepository } | null = null;
let reportedConfigProblem = false;

/**
 * Selects the configured inventory adapter.
 *
 * - No `INVENTORY_SOURCE` → unavailable adapter (`not-configured`). No fixtures, ever.
 * - Invalid/incomplete config → unavailable adapter; offending variable *names* are logged once.
 * - `google-sheets` → Sheets adapter behind the freshness-bounded cache.
 */
export function getInventoryRepository(
  config: InventorySourceConfig = readInventorySourceConfig(),
): InventoryRepository {
  switch (config.kind) {
    case "none":
      return new UnavailableInventoryRepository();
    case "invalid":
      if (!reportedConfigProblem) {
        reportedConfigProblem = true;
        console.error(`[inventory] source not configured; check env: ${config.problems.join(", ")}`);
      }
      return new UnavailableInventoryRepository();
    case "google-sheets": {
      const key = `${config.spreadsheetId}|${config.auth.mode}|${config.auth.serviceAccountEmail}|${config.media}`;
      if (config.warnings.length > 0 && memo?.key !== key) {
        console.error(`[inventory] ignoring invalid optional env: ${config.warnings.join(", ")}`);
      }
      if (memo?.key !== key) memo = { key, repository: createSheetsRepository(config) };
      return memo.repository;
    }
    default: {
      const unhandled: never = config;
      return unhandled;
    }
  }
}

function createSheetsRepository(
  config: Extract<InventorySourceConfig, { kind: "google-sheets" }>,
): InventoryRepository {
  const mediaEnabled = config.media === "google-drive";
  const getAccessToken = createAccessTokenProvider(
    config.auth,
    mediaEnabled ? [SHEETS_READONLY_SCOPE, DRIVE_READONLY_SCOPE] : [SHEETS_READONLY_SCOPE],
  );

  const reader = createSheetsReader({ spreadsheetId: config.spreadsheetId, getAccessToken });
  const readFresh = () => loadInventorySnapshot(reader, { readMediaLinks: mediaEnabled });

  // Only the mapped public snapshot (plus server-only folder refs) is cached — never raw
  // Sheet responses.
  const readCached = unstable_cache(readFresh, [SNAPSHOT_CACHE_VERSION, config.media, config.spreadsheetId], {
    revalidate: INVENTORY_REVALIDATE_SECONDS,
    tags: [INVENTORY_CACHE_TAG],
  });

  const media = mediaEnabled ? createDriveMediaService(getAccessToken) : null;
  return new GoogleSheetsInventoryRepository(createSnapshotReader({ readCached, readFresh }), media);
}

function createDriveMediaService(getAccessToken: () => Promise<string>): VehicleMediaService {
  const reader = createDriveReader({ getAccessToken });
  // Transient Drive errors are thrown by `resolveFolderMedia` and are therefore not cached.
  const resolveFolder = unstable_cache(
    (folderId: string) => resolveFolderMedia(reader, { kind: "folder", folderId }),
    [MEDIA_CACHE_VERSION],
    { revalidate: MEDIA_LISTING_REVALIDATE_SECONDS, tags: [MEDIA_CACHE_TAG] },
  );
  return createMediaService({ reader, resolveFolder, sanitize: sanitizeImage });
}
