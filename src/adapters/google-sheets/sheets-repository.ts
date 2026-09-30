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
 * With a media service, each vehicle's `media` is resolved from its own Drive folder. A media
 * problem only empties that vehicle's `media`; it never affects inventory or other vehicles.
 * Without one (media source not enabled), `media` stays empty.
 */
export class GoogleSheetsInventoryRepository implements InventoryRepository {
  constructor(
    private readonly readSnapshot: () => Promise<SnapshotResult>,
    private readonly media: VehicleMediaService | null = null,
  ) {}

  async listAvailable(): Promise<InventoryListResult> {
    const snapshot = await this.readSnapshot();
    if (snapshot.kind !== "ok") return snapshot;
    return listResult(await this.withMedia(snapshot, snapshot.vehicles.filter((v) => v.status === "available")));
  }

  async listSold(): Promise<InventoryListResult> {
    const snapshot = await this.readSnapshot();
    if (snapshot.kind !== "ok") return snapshot;
    return listResult(await this.withMedia(snapshot, snapshot.vehicles.filter((v) => v.status === "sold")));
  }

  async getById(id: string): Promise<VehicleLookupResult> {
    const snapshot = await this.readSnapshot();
    if (snapshot.kind !== "ok") return snapshot;
    const vehicle = snapshot.vehicles.find((v) => v.id === id);
    if (!vehicle) return { kind: "not-found" };
    const [withMedia] = await this.withMedia(snapshot, [vehicle]);
    return { kind: "ok", vehicle: withMedia };
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

  private async withMedia(snapshot: InventorySnapshot, vehicles: readonly Vehicle[]): Promise<Vehicle[]> {
    const media = this.media;
    if (media === null) return [...vehicles];
    return Promise.all(
      vehicles.map(async (vehicle) => {
        const folder = folderOf(snapshot, vehicle.id) ?? { kind: "missing" as const };
        return { ...vehicle, media: await media.mediaFor(vehicle.id, folder) };
      }),
    );
  }
}

function folderOf(snapshot: InventorySnapshot, vehicleId: string) {
  return snapshot.mediaFolders.find(([id]) => id === vehicleId)?.[1];
}
