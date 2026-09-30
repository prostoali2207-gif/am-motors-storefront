import type { InventoryListResult, VehicleLookupResult } from "@/domain/inventory-result";

/**
 * The only way the app reads inventory. Implementations return public `Vehicle` objects,
 * never raw source rows, and report failures as `unavailable` instead of throwing or
 * returning substitute data.
 */
export interface InventoryRepository {
  /** Vehicles with status `available` only. */
  listAvailable(): Promise<InventoryListResult>;
  /** Vehicles with status `sold` only (for a separate sold/social-proof context). */
  listSold(): Promise<InventoryListResult>;
  /** Exact match on the authoritative ID. Non-public or unknown IDs → `not-found`. */
  getById(id: string): Promise<VehicleLookupResult>;
}
