import "server-only";

import { connection } from "next/server";
import { cache } from "react";

import type {
  InventoryListResult,
  InventoryUnavailable,
  VehicleLookupResult,
} from "@/domain/inventory-result";
import { getInventoryRepository } from "./index";
import type { InventoryRepository } from "./repository";

const SOURCE_ERROR: InventoryUnavailable = { kind: "unavailable", reason: "source-error" };

/**
 * Runs a repository read at request time and converts unexpected failures into the
 * truthful `unavailable` state. Only the error name is logged — never row data.
 */
export async function safeRead<T>(
  read: () => Promise<T>,
  label: string,
): Promise<T | InventoryUnavailable> {
  try {
    return await read();
  } catch (error) {
    const name = error instanceof Error ? error.name : "UnknownError";
    console.error(`[inventory] ${label} failed: ${name}`);
    return SOURCE_ERROR;
  }
}

async function repository(): Promise<InventoryRepository> {
  // Inventory is never baked into the build output: it is read per request. Caching and
  // revalidation are designed with the real source in Phase 2.
  await connection();
  return getInventoryRepository();
}

export const listAvailableVehicles = cache(async (): Promise<InventoryListResult> => {
  const repo = await repository();
  return safeRead(() => repo.listAvailable(), "listAvailable");
});

export const getVehicle = cache(async (id: string): Promise<VehicleLookupResult> => {
  const repo = await repository();
  return safeRead(() => repo.getById(id), "getById");
});
