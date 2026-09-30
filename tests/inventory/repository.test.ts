import { describe, expect, it, vi } from "vitest";

import { GoogleSheetsInventoryRepository } from "@/adapters/google-sheets/sheets-repository";
import { UnavailableInventoryRepository } from "@/adapters/unavailable/unavailable-repository";
import { getInventoryRepository } from "@/inventory";
import { safeRead } from "@/inventory/queries";
import { syntheticAvailable, syntheticLongId, syntheticSold } from "../fixtures/vehicles";
import { InMemoryInventoryRepository } from "../support/in-memory-repository";

const NOT_CONFIGURED = { kind: "unavailable", reason: "not-configured" };

describe("adapter selection", () => {
  it("defaults to the unavailable adapter when no source is configured", () => {
    expect(getInventoryRepository({ kind: "none" })).toBeInstanceOf(UnavailableInventoryRepository);
  });

  it("uses the unavailable adapter (never fixtures) when configuration is invalid", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const repo = getInventoryRepository({ kind: "invalid", problems: ["GOOGLE_AUTH_MODE"] });
    expect(repo).toBeInstanceOf(UnavailableInventoryRepository);
    await expect(repo.listAvailable()).resolves.toEqual(NOT_CONFIGURED);
    expect(JSON.stringify(log.mock.calls)).toContain("GOOGLE_AUTH_MODE");
    log.mockRestore();
  });

  it("uses the Google Sheets adapter when configured", () => {
    const repo = getInventoryRepository({
      kind: "google-sheets",
      spreadsheetId: "TEST_spreadsheet_id_0000000000",
      auth: {
        mode: "vercel-oidc",
        serviceAccountEmail: "test-reader@test-project.iam.gserviceaccount.com",
        projectNumber: "123456789012",
        workloadIdentityPoolId: "test-pool",
        workloadIdentityPoolProviderId: "test-provider",
      },
    });
    expect(repo).toBeInstanceOf(GoogleSheetsInventoryRepository);
  });
});

describe("unavailable adapter", () => {
  it("reports unavailable for every read and never returns vehicles", async () => {
    const repo = new UnavailableInventoryRepository();
    await expect(repo.listAvailable()).resolves.toEqual(NOT_CONFIGURED);
    await expect(repo.listSold()).resolves.toEqual(NOT_CONFIGURED);
    await expect(repo.getById("TEST-0001")).resolves.toEqual(NOT_CONFIGURED);
  });
});

describe("repository contract (in-memory test adapter)", () => {
  it("lists only available vehicles; sold are never listed as available", async () => {
    const repo = new InMemoryInventoryRepository([syntheticAvailable, syntheticSold]);
    await expect(repo.listAvailable()).resolves.toEqual({ kind: "ok", vehicles: [syntheticAvailable] });
    await expect(repo.listSold()).resolves.toEqual({ kind: "ok", vehicles: [syntheticSold] });
  });

  it("returns empty, not unavailable, when there are no vehicles", async () => {
    const repo = new InMemoryInventoryRepository([]);
    await expect(repo.listAvailable()).resolves.toEqual({ kind: "empty" });
  });

  it("finds vehicles by exact ID, including IDs outside the observed pattern", async () => {
    const repo = new InMemoryInventoryRepository([syntheticSold, syntheticLongId]);
    await expect(repo.getById("TEST-0002")).resolves.toEqual({ kind: "ok", vehicle: syntheticSold });
    await expect(repo.getById("TEST-100000")).resolves.toEqual({ kind: "ok", vehicle: syntheticLongId });
    await expect(repo.getById("test-0002")).resolves.toEqual({ kind: "not-found" });
    await expect(repo.getById("TEST-9999")).resolves.toEqual({ kind: "not-found" });
  });

  it("hides vehicles whose ID is duplicated", async () => {
    const repo = new InMemoryInventoryRepository([syntheticAvailable, { ...syntheticAvailable }]);
    await expect(repo.getById(syntheticAvailable.id)).resolves.toEqual({ kind: "not-found" });
    await expect(repo.listAvailable()).resolves.toEqual({ kind: "empty" });
  });
});

describe("safeRead", () => {
  it("turns a thrown error into unavailable without logging its message", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await safeRead(async () => {
      throw new TypeError("secret row contents");
    }, "listAvailable");
    expect(result).toEqual({ kind: "unavailable", reason: "source-error" });
    expect(log).toHaveBeenCalledWith("[inventory] listAvailable failed: TypeError");
    expect(JSON.stringify(log.mock.calls)).not.toContain("secret row contents");
    log.mockRestore();
  });
});
