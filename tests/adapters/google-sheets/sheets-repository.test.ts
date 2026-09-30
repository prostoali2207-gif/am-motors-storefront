import { describe, expect, it } from "vitest";

import { loadInventorySnapshot } from "@/adapters/google-sheets/loader";
import { GoogleSheetsInventoryRepository, type SnapshotResult } from "@/adapters/google-sheets/sheets-repository";
import { createSnapshotReader } from "@/inventory/freshness";
import { InventorySourceError } from "@/inventory/source-error";
import { FakeSheet, syntheticRow } from "../../support/fake-sheet";

const silent = { info: () => {}, warn: () => {} };

function repositoryOver(sheet: FakeSheet) {
  const readFresh = () => loadInventorySnapshot(sheet, { log: silent });
  return new GoogleSheetsInventoryRepository(
    createSnapshotReader({ readCached: readFresh, readFresh, logError: () => {} }),
  );
}

describe("GoogleSheetsInventoryRepository", () => {
  const sheet = new FakeSheet([
    syntheticRow({ ID: "TEST-0001" }),
    syntheticRow({ ID: "TEST-0002", Статус: "Продана" }),
    syntheticRow({ ID: "TEST-0003", Статус: "Test status" }),
    syntheticRow({ ID: "TEST-100000" }),
  ]);
  const repo = repositoryOver(sheet);

  it("lists only available vehicles; sold are excluded", async () => {
    const result = await repo.listAvailable();
    if (result.kind !== "ok") throw new Error(result.kind);
    expect(result.vehicles.map((v) => [v.id, v.status])).toEqual([
      ["TEST-0001", "available"],
      ["TEST-100000", "available"],
    ]);
  });

  it("lists sold vehicles separately", async () => {
    const result = await repo.listSold();
    if (result.kind !== "ok") throw new Error(result.kind);
    expect(result.vehicles.map((v) => v.id)).toEqual(["TEST-0002"]);
  });

  it("finds vehicles by exact ID and hides non-public ones", async () => {
    await expect(repo.getById("TEST-0002")).resolves.toMatchObject({ kind: "ok", vehicle: { status: "sold" } });
    await expect(repo.getById("TEST-0003")).resolves.toEqual({ kind: "not-found" });
    await expect(repo.getById("test-0001")).resolves.toEqual({ kind: "not-found" });
    await expect(repo.getById("TEST-9999")).resolves.toEqual({ kind: "not-found" });
  });

  it("returns empty (not unavailable) when there are no public vehicles", async () => {
    const empty = repositoryOver(new FakeSheet([syntheticRow({ Статус: "Продана" })]));
    await expect(empty.listAvailable()).resolves.toEqual({ kind: "empty" });
  });

  it.each([
    ["source-error", "http-401"],
    ["source-error", "auth-failed"],
    ["invalid-data", "missing-public-column"],
  ] as const)("reports %s/%s as unavailable on every read, with no fallback data", async (reason, code) => {
    const failing = new FakeSheet([syntheticRow()]);
    failing.readRow = async () => {
      throw new InventorySourceError(reason, code);
    };
    const repo = repositoryOver(failing);
    const expected: SnapshotResult = { kind: "unavailable", reason };
    await expect(repo.listAvailable()).resolves.toEqual(expected);
    await expect(repo.listSold()).resolves.toEqual(expected);
    await expect(repo.getById("TEST-0001")).resolves.toEqual(expected);
  });
});
