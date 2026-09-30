import "server-only";

import { UnavailableInventoryRepository } from "@/adapters/unavailable/unavailable-repository";
import type { InventoryRepository } from "./repository";

/**
 * Selects the configured inventory adapter. Phase 1 has no data source, so this always
 * returns the unavailable adapter. The Google Sheets adapter is wired in here in Phase 2.
 */
export function getInventoryRepository(): InventoryRepository {
  return new UnavailableInventoryRepository();
}
