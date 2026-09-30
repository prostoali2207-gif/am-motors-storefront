import type { Vehicle } from "./vehicle";

/**
 * Why inventory cannot be shown. Never rendered as "no cars".
 * - `not-configured`: no data source or incomplete server configuration.
 * - `source-error`: the source could not be read (network, auth, quota, upstream error).
 * - `invalid-data`: the source was read but its structure failed validation (e.g. header).
 */
export type UnavailableReason = "not-configured" | "source-error" | "invalid-data";

export type InventoryUnavailable = { readonly kind: "unavailable"; readonly reason: UnavailableReason };

export type InventoryListResult =
  | { readonly kind: "ok"; readonly vehicles: readonly Vehicle[] }
  | { readonly kind: "empty" }
  | InventoryUnavailable;

export type VehicleLookupResult =
  | { readonly kind: "ok"; readonly vehicle: Vehicle }
  | { readonly kind: "not-found" }
  | InventoryUnavailable;

/** Result of serving one sanitized vehicle image through the site's media route. */
export type MediaImageResult =
  | { readonly kind: "ok"; readonly bytes: Uint8Array; readonly contentType: "image/jpeg" }
  | { readonly kind: "not-found" }
  | InventoryUnavailable;

export function listResult(vehicles: readonly Vehicle[]): InventoryListResult {
  return vehicles.length === 0 ? { kind: "empty" } : { kind: "ok", vehicles };
}
