import "server-only";

import { unstable_cache } from "next/cache";

import { createAccessTokenProvider } from "@/adapters/google-sheets/auth";
import { loadInventorySnapshot } from "@/adapters/google-sheets/loader";
import { createSheetsReader } from "@/adapters/google-sheets/sheets-client";
import { GoogleSheetsInventoryRepository } from "@/adapters/google-sheets/sheets-repository";
import { UnavailableInventoryRepository } from "@/adapters/unavailable/unavailable-repository";
import { readInventorySourceConfig, type InventorySourceConfig } from "@/lib/env";
import { createSnapshotReader, INVENTORY_CACHE_TAG, INVENTORY_REVALIDATE_SECONDS } from "./freshness";
import type { InventoryRepository } from "./repository";

/** Bump when the cached snapshot shape or mapping rules change, to drop old cache entries. */
const SNAPSHOT_CACHE_VERSION = "sheets-v1";

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
      const key = `${config.spreadsheetId}|${config.auth.mode}|${config.auth.serviceAccountEmail}`;
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
  const reader = createSheetsReader({
    spreadsheetId: config.spreadsheetId,
    getAccessToken: createAccessTokenProvider(config.auth),
  });
  const readFresh = () => loadInventorySnapshot(reader);

  // Only the mapped public snapshot is cached — never raw Sheet responses.
  const readCached = unstable_cache(readFresh, [SNAPSHOT_CACHE_VERSION, config.spreadsheetId], {
    revalidate: INVENTORY_REVALIDATE_SECONDS,
    tags: [INVENTORY_CACHE_TAG],
  });

  return new GoogleSheetsInventoryRepository(createSnapshotReader({ readCached, readFresh }));
}
