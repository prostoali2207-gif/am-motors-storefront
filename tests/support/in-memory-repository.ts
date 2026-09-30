import { listResult } from "@/domain/inventory-result";
import type { MediaImageResult, VehicleLookupResult } from "@/domain/inventory-result";
import type { Vehicle } from "@/domain/vehicle";
import { keepUniquelyIdentified } from "@/domain/vehicle-id";
import type { InventoryRepository } from "@/inventory/repository";

/** Test-only adapter over synthetic fixtures. Never imported by production code. */
export class InMemoryInventoryRepository implements InventoryRepository {
  private readonly vehicles: Vehicle[];

  constructor(vehicles: readonly Vehicle[]) {
    this.vehicles = keepUniquelyIdentified(vehicles).kept;
  }

  async listAvailable() {
    return listResult(this.vehicles.filter((v) => v.status === "available"));
  }

  async listSold() {
    return listResult(this.vehicles.filter((v) => v.status === "sold"));
  }

  async getById(id: string): Promise<VehicleLookupResult> {
    const vehicle = this.vehicles.find((v) => v.id === id);
    return vehicle ? { kind: "ok", vehicle } : { kind: "not-found" };
  }

  async getImage(): Promise<MediaImageResult> {
    return { kind: "not-found" };
  }
}
