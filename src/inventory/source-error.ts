import type { UnavailableReason } from "@/domain/inventory-result";

/**
 * A data-source failure that must render as `unavailable`. `code` is a short, fixed
 * diagnostic token (e.g. `http-403`, `missing-public-column`); it never contains row values,
 * credentials or upstream response bodies, so the message is safe to log.
 */
export class InventorySourceError extends Error {
  readonly reason: Exclude<UnavailableReason, "not-configured">;
  readonly code: string;

  constructor(reason: Exclude<UnavailableReason, "not-configured">, code: string) {
    super(`inventory source ${reason}: ${code}`);
    this.name = "InventorySourceError";
    this.reason = reason;
    this.code = code;
  }
}
