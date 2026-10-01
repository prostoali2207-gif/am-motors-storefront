import type { VehicleMediaService } from "@/adapters/google-drive-media/media-service";
import { listResult } from "@/domain/inventory-result";
import type {
  InventoryListResult,
  InventoryUnavailable,
  MediaImageResult,
  VehicleLookupResult,
} from "@/domain/inventory-result";
import type { Vehicle } from "@/domain/vehicle";
import { vehicleImages } from "@/domain/vehicle-media";
import type { InventoryRepository } from "@/inventory/repository";
import type { InventorySnapshot } from "./loader";

export type SnapshotResult = ({ readonly kind: "ok" } & InventorySnapshot) | InventoryUnavailable;

/**
 * Inventory repository backed by the Google Sheet. It only sees public `Vehicle` snapshots
 * (freshness-checked by the caller); it never falls back to other data.
 *
 * Media:
 * - `getById` (VDP) carries every approved `Website/` image of that vehicle.
 * - Listing reads (`listAvailable`, `listSold`) carry at most ONE image per vehicle: the cover
 *   (`01.*`, first in the confirmed order), for the listing card. Covers are resolved through the
 *   same per-folder media service (folder listings cached 5 minutes; metadata only, no image
 *   bytes), in parallel with a small concurrency limit.
 * - `getImage` serves sanitized bytes for the media route.
 * A media problem only empties that vehicle's `media` (text-only card / "Photos unavailable");
 * it never affects inventory or other vehicles. Without a media service (media source not
 * enabled), `media` stays empty everywhere and no Drive call is made.
 */
export class GoogleSheetsInventoryRepository implements InventoryRepository {
  constructor(
    private readonly readSnapshot: () => Promise<SnapshotResult>,
    private readonly media: VehicleMediaService | null = null,
  ) {}

  async listAvailable(): Promise<InventoryListResult> {
    const snapshot = await this.readSnapshot();
    if (snapshot.kind !== "ok") return snapshot;
    return listResult(await this.withCovers(snapshot, snapshot.vehicles.filter((v) => v.status === "available")));
  }

  async listSold(): Promise<InventoryListResult> {
    const snapshot = await this.readSnapshot();
    if (snapshot.kind !== "ok") return snapshot;
    return listResult(await this.withCovers(snapshot, snapshot.vehicles.filter((v) => v.status === "sold")));
  }

  async getById(id: string): Promise<VehicleLookupResult> {
    const snapshot = await this.readSnapshot();
    if (snapshot.kind !== "ok") return snapshot;
    const vehicle = snapshot.vehicles.find((v) => v.id === id);
    if (!vehicle) return { kind: "not-found" };
    return { kind: "ok", vehicle: await this.withMedia(snapshot, vehicle) };
  }

  async getImage(vehicleId: string, mediaId: string, revision: string): Promise<MediaImageResult> {
    if (this.media === null) return { kind: "not-found" };
    const snapshot = await this.readSnapshot();
    if (snapshot.kind !== "ok") return snapshot;
    // Only public vehicles (available or sold) of the current snapshot can serve media.
    const folder = folderOf(snapshot, vehicleId);
    if (!snapshot.vehicles.some((v) => v.id === vehicleId) || folder === undefined) return { kind: "not-found" };
    return this.media.imageFor(vehicleId, folder, mediaId, revision);
  }

  /** Attaches each listed vehicle's cover (or nothing), keeping the source order. */
  private async withCovers(snapshot: InventorySnapshot, vehicles: readonly Vehicle[]): Promise<Vehicle[]> {
    if (this.media === null) return [...vehicles];
    return mapWithConcurrency(vehicles, COVER_CONCURRENCY, async (vehicle) => {
      const cover = vehicleImages((await this.withMedia(snapshot, vehicle)).media)[0];
      return { ...vehicle, media: cover ? [cover] : [] };
    });
  }

  /** Resolves the media of ONE vehicle from its own folder. */
  private async withMedia(snapshot: InventorySnapshot, vehicle: Vehicle): Promise<Vehicle> {
    if (this.media === null) return vehicle;
    const folder = folderOf(snapshot, vehicle.id) ?? { kind: "missing" as const };
    return { ...vehicle, media: await this.media.mediaFor(vehicle.id, folder) };
  }
}

function folderOf(snapshot: InventorySnapshot, vehicleId: string) {
  return snapshot.mediaFolders.find(([id]) => id === vehicleId)?.[1];
}

/**
 * Cold-cache cover resolution costs 3 Drive metadata calls per vehicle; a few vehicles at a time
 * keeps a cold listing render fast without bursting dozens of requests at Drive at once.
 */
export const COVER_CONCURRENCY = 6;

/** `Promise.all` with at most `limit` tasks in flight; results keep the input order. */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  task: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const index = next++;
      results[index] = await task(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}
