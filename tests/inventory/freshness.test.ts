import { describe, expect, it, vi } from "vitest";

import type { InventorySnapshot } from "@/adapters/google-sheets/loader";
import { createSnapshotReader, INVENTORY_MAX_AGE_MS, INVENTORY_REVALIDATE_SECONDS } from "@/inventory/freshness";
import { InventorySourceError } from "@/inventory/source-error";
import { syntheticAvailable } from "../fixtures/vehicles";

const NOW = 1_000_000_000;

function snapshot(ageMs: number): InventorySnapshot {
  return { vehicles: [syntheticAvailable], fetchedAt: NOW - ageMs };
}

function setup(cached: () => Promise<InventorySnapshot>, fresh: () => Promise<InventorySnapshot>) {
  const logError = vi.fn();
  const readCached = vi.fn(cached);
  const readFresh = vi.fn(fresh);
  const read = createSnapshotReader({ readCached, readFresh, now: () => NOW, logError });
  return { read, readCached, readFresh, logError };
}

describe("freshness policy", () => {
  it("revalidates within the hard max age", () => {
    expect(INVENTORY_REVALIDATE_SECONDS * 1000).toBeLessThan(INVENTORY_MAX_AGE_MS);
    expect(INVENTORY_MAX_AGE_MS).toBeLessThanOrEqual(5 * 60 * 1000);
  });

  it("serves a cached snapshot inside the max age without a direct read", async () => {
    const { read, readFresh } = setup(async () => snapshot(INVENTORY_MAX_AGE_MS), async () => snapshot(0));
    await expect(read()).resolves.toEqual({ kind: "ok", vehicles: [syntheticAvailable], fetchedAt: NOW - INVENTORY_MAX_AGE_MS });
    expect(readFresh).not.toHaveBeenCalled();
  });

  it("never serves a snapshot older than the max age: reads the source directly", async () => {
    const { read, readFresh } = setup(async () => snapshot(INVENTORY_MAX_AGE_MS + 1), async () => snapshot(0));
    await expect(read()).resolves.toMatchObject({ kind: "ok", fetchedAt: NOW });
    expect(readFresh).toHaveBeenCalledOnce();
  });

  it("returns unavailable (not stale data) when the direct read fails", async () => {
    const { read, logError } = setup(
      async () => snapshot(60 * 60 * 1000),
      async () => {
        throw new InventorySourceError("source-error", "http-403");
      },
    );
    await expect(read()).resolves.toEqual({ kind: "unavailable", reason: "source-error" });
    expect(logError).toHaveBeenCalledWith("[inventory] source unavailable: source-error/http-403");
  });

  it("keeps the invalid-data reason", async () => {
    const { read } = setup(
      async () => {
        throw new InventorySourceError("invalid-data", "missing-public-column");
      },
      async () => snapshot(0),
    );
    await expect(read()).resolves.toEqual({ kind: "unavailable", reason: "invalid-data" });
  });

  it("logs only the error name for unexpected errors", async () => {
    const { read, logError } = setup(
      async () => {
        throw new TypeError("PRIVATE-ROW-CONTENT");
      },
      async () => snapshot(0),
    );
    await expect(read()).resolves.toEqual({ kind: "unavailable", reason: "source-error" });
    expect(logError).toHaveBeenCalledWith("[inventory] source unavailable: TypeError");
    expect(JSON.stringify(logError.mock.calls)).not.toContain("PRIVATE-ROW-CONTENT");
  });

  it("shares one direct read between concurrent requests", async () => {
    let release: (s: InventorySnapshot) => void = () => {};
    const { read, readFresh } = setup(
      async () => snapshot(INVENTORY_MAX_AGE_MS + 1),
      () => new Promise<InventorySnapshot>((resolve) => (release = resolve)),
    );
    const pending = Promise.all([read(), read(), read()]);
    await vi.waitFor(() => expect(readFresh).toHaveBeenCalledOnce());
    release(snapshot(0));
    const results = await pending;
    expect(results.every((r) => r.kind === "ok")).toBe(true);
    expect(readFresh).toHaveBeenCalledOnce();

    // The next stale read starts a new direct read.
    const next = read();
    await vi.waitFor(() => expect(readFresh).toHaveBeenCalledTimes(2));
    release(snapshot(0));
    await expect(next).resolves.toMatchObject({ kind: "ok" });
  });
});
