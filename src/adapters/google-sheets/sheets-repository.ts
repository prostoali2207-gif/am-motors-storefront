import { listResult } from "@/domain/inventory-result";
import type {
  InventoryListResult,
  InventoryUnavailable,
  VehicleLookupResult,
} from "@/domain/inventory-result";
import type { InventoryRepository } from "@/inventory/repository";
import type { InventorySnapshot } from "./loader";

export type SnapshotResult = ({ readonly kind: "ok" } & InventorySnapshot) | InventoryUnavailable;

/**
 * Inventory repository backed by the Google Sheet. It only sees public `Vehicle` snapshots
 * (freshness-checked by the caller); it never falls back to other data.
 */
export class GoogleSheetsInventoryRepository implements InventoryRepository {
  constructor(private readonly readSnapshot: () => Promise<SnapshotResult>) {}

  async listAvailable(): Promise<InventoryListResult> {
    const snapshot = await this.readSnapshot();
    if (snapshot.kind !== "ok") return snapshot;
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
    return vehicle ? { kind: "ok", vehicle } : { kind: "not-found" };
  }
}
