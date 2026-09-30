import type { VehicleMediaService } from "@/adapters/google-drive-media/media-service";
import { listResult } from "@/domain/inventory-result";
import type {
  InventoryListResult,
  InventoryUnavailable,
  MediaImageResult,
  VehicleLookupResult,
} from "@/domain/inventory-result";
import type { Vehicle } from "@/domain/vehicle";
import type { InventoryRepository } from "@/inventory/repository";
import type { InventorySnapshot } from "./loader";

export type SnapshotResult = ({ readonly kind: "ok" } & InventorySnapshot) | InventoryUnavailable;

/**
 * Inventory repository backed by the Google Sheet. It only sees public `Vehicle` snapshots
 * (freshness-checked by the caller); it never falls back to other data.
 *
 * Media is resolved ONLY for a single vehicle (`getById`, used by the VDP) and for the media
 * route (`getImage`). Listing reads (`listAvailable`, `listSold`) return `media: []` and make no
 * Drive calls: listing pages show no photos in Phase 3, and nothing is prefetched. A media
 * problem only empties that vehicle's `media`; it never affects inventory or other vehicles.
 * Without a media service (media source not enabled), `media` stays empty everywhere.
 */
export class GoogleSheetsInventoryRepository implements InventoryRepository {
  constructor(
    private readonly readSnapshot: () => Promise<SnapshotResult>,
    private readonly media: VehicleMediaService | null = null,
  ) {}

  async listAvailable(): Promise<InventoryListResult> {
    const snapshot = await this.readSnapshot();
    if (snapshot.kind !== "ok") return snapshot;
    // No media resolution for listings: vehicles keep the `media: []` set by the mapper.
    return listResult(snapshot.vehicles.filter((v) => v.status === "available"));
  }

  async listSold(): Promise<InventoryListResult> {
    const snapshot = await this.readSnapshot();
    if (snapshot.kind !== "ok") return snapshot;
    return listResult(snapshot.vehicles.filter((v) => v.status === "sold"));
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
