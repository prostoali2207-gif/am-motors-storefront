import type { InventoryUnavailable } from "@/domain/inventory-result";
import type { InventorySnapshot } from "@/adapters/google-sheets/loader";
import type { SnapshotResult } from "@/adapters/google-sheets/sheets-repository";
import { InventorySourceError } from "./source-error";

/**
 * Inventory freshness policy — accepted for V1 on 2026-09-30
 * (docs/business-rules.md → Google Sheets integration; open question 11).
 *
 * - Cached snapshots are revalidated every `INVENTORY_REVALIDATE_SECONDS` (stale-while-
 *   revalidate: the first request after the window still gets the old snapshot while a fresh
 *   read runs in the background).
 * - Hard bound: a snapshot older than `INVENTORY_MAX_AGE_MS` is never served. The request
 *   reads the Sheet directly instead; if that fails, it gets `unavailable`. This covers idle
 *   periods and failing background revalidation, so a car marked "Продана" can never be
 *   shown as available for longer than the max age.
 * - Cache tag `INVENTORY_CACHE_TAG` allows adding on-demand revalidation later.
 */
export const INVENTORY_REVALIDATE_SECONDS = 60;
export const INVENTORY_MAX_AGE_MS = 120_000;
export const INVENTORY_CACHE_TAG = "inventory";

export interface SnapshotReaderOptions {
  /** Cached read (may return a stale snapshot). */
  readonly readCached: () => Promise<InventorySnapshot>;
  /** Direct, uncached read of the source. */
  readonly readFresh: () => Promise<InventorySnapshot>;
  readonly maxAgeMs?: number;
  readonly now?: () => number;
  readonly logError?: (message: string) => void;
}

/**
 * Serves a snapshot no older than `maxAgeMs`, or `unavailable`. Never substitutes other data.
 */
export function createSnapshotReader(options: SnapshotReaderOptions): () => Promise<SnapshotResult> {
  const maxAgeMs = options.maxAgeMs ?? INVENTORY_MAX_AGE_MS;
  const now = options.now ?? Date.now;
  const logError = options.logError ?? ((message: string) => console.error(message));

  const isFresh = (snapshot: InventorySnapshot) => now() - snapshot.fetchedAt <= maxAgeMs;

  // Single-flight: concurrent requests that find the cache too old share one direct read,
  // so an idle period or an outage does not turn into a burst of Sheets API calls.
  let inFlight: Promise<InventorySnapshot> | null = null;
  const readFreshOnce = () => {
    inFlight ??= options.readFresh().finally(() => {
      inFlight = null;
    });
    return inFlight;
  };

  return async () => {
    try {
      const cached = await options.readCached();
      if (isFresh(cached)) return ok(cached);
      const fresh = await readFreshOnce();
      if (isFresh(fresh)) return ok(fresh);
      throw new InventorySourceError("source-error", "stale-snapshot");
    } catch (error) {
      return toUnavailable(error, logError);
    }
  };
}

function ok(snapshot: InventorySnapshot): SnapshotResult {
  return { kind: "ok", vehicles: snapshot.vehicles, fetchedAt: snapshot.fetchedAt };
}

function toUnavailable(error: unknown, logError: (message: string) => void): InventoryUnavailable {
  if (error instanceof InventorySourceError) {
    logError(`[inventory] source unavailable: ${error.reason}/${error.code}`);
    return { kind: "unavailable", reason: error.reason };
  }
  // Unknown errors may carry library messages; log the error name only.
  const name = error instanceof Error ? error.name : "UnknownError";
  logError(`[inventory] source unavailable: ${name}`);
  return { kind: "unavailable", reason: "source-error" };
}
