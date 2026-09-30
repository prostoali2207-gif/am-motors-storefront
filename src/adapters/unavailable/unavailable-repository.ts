import type {
  InventoryListResult,
  InventoryUnavailable,
  MediaImageResult,
  VehicleLookupResult,
} from "@/domain/inventory-result";
import type { InventoryRepository } from "@/inventory/repository";

const NOT_CONFIGURED: InventoryUnavailable = { kind: "unavailable", reason: "not-configured" };

/**
 * Production-safe default while no data source is connected (Phase 1).
 * Always reports `unavailable` — it never returns vehicles, fixtures or cached data.
 */
export class UnavailableInventoryRepository implements InventoryRepository {
  async listAvailable(): Promise<InventoryListResult> {
    return NOT_CONFIGURED;
  }

  async listSold(): Promise<InventoryListResult> {
    return NOT_CONFIGURED;
  }

  async getById(id: string): Promise<VehicleLookupResult> {
    void id; // No source to look up in Phase 1.
    return NOT_CONFIGURED;
  }

  async getImage(vehicleId: string, mediaId: string, revision: string): Promise<MediaImageResult> {
    void vehicleId;
    void mediaId;
    void revision;
    return NOT_CONFIGURED;
  }
}
