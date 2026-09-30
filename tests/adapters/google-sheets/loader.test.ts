import { describe, expect, it } from "vitest";

import { loadInventorySnapshot, type LoaderLog } from "@/adapters/google-sheets/loader";
import { EXPECTED_HEADER, PUBLIC_COLUMNS } from "@/adapters/google-sheets/schema";
import { InventorySourceError } from "@/inventory/source-error";
import { FakeSheet, num, PRIVATE_MARKERS, syntheticRow } from "../../support/fake-sheet";

const NOW = Date.UTC(2026, 0, 15);

function recordingLog(): LoaderLog & { lines: string[] } {
  const lines: string[] = [];
  return { lines, info: (m) => lines.push(m), warn: (m) => lines.push(m) };
}

async function load(sheet: FakeSheet, log = recordingLog()) {
  const snapshot = await loadInventorySnapshot(sheet, { now: () => NOW, log });
  return { snapshot, log };
}

describe("loadInventorySnapshot", () => {
  it("reads the Sheet into public vehicles with numeric effective values", async () => {
    const sheet = new FakeSheet([
      syntheticRow(),
      syntheticRow({ ID: "TEST-0002", Статус: "Продана", "Цена, AED": undefined }),
    ]);
    const { snapshot } = await load(sheet);

    expect(snapshot.fetchedAt).toBe(NOW);
    expect(snapshot.vehicles).toEqual([
      {
        id: "TEST-0001",
        status: "available",
        make: "Testmake",
        model: "Fixture Alpha",
        trim: "Synthetic Trim",
        year: 2001,
        priceAed: 11111,
        mileageKm: 22222,
        regionalSpec: "Test spec",
        color: "Test color",
        engine: "Test engine",
        fuel: "Test fuel",
        transmission: "Test gearbox",
        drivetrain: "Test drive",
      },
      expect.objectContaining({ id: "TEST-0002", status: "sold", priceAed: null }),
    ]);
  });

  it("reads only the 'Машины' tab and only allowlisted columns", async () => {
    const sheet = new FakeSheet([syntheticRow()]);
    await load(sheet);

    expect(sheet.requestedRanges.every((range) => range.startsWith("'Машины'!"))).toBe(true);
    const requested = new Set(sheet.requestedColumnNames());
    expect([...requested].sort()).toEqual(Object.values(PUBLIC_COLUMNS).sort());
    for (const privateColumn of Object.keys(PRIVATE_MARKERS)) {
      expect(requested.has(privateColumn)).toBe(false);
    }
  });

  it("never lets private values into the snapshot or the logs", async () => {
    const sheet = new FakeSheet([syntheticRow(), syntheticRow({ ID: "TEST-0002", Год: "bad" })]);
    const { snapshot, log } = await load(sheet);
    const output = JSON.stringify(snapshot) + log.lines.join("\n");
    for (const marker of Object.values(PRIVATE_MARKERS)) {
      expect(output).not.toContain(marker);
    }
  });

  it("logs counts, row numbers and codes only — no cell values", async () => {
    const sheet = new FakeSheet([
      syntheticRow(),
      syntheticRow({ ID: "TEST-0002", "Цена, AED": "AED 5,000" }),
      syntheticRow({ ID: "TEST-0003", Статус: "Test status" }),
    ]);
    const { log } = await load(sheet);
    expect(log.lines).toEqual([
      "[inventory:sheets] read ok: 2 public (2 available, 0 sold), 1 with non-public status, " +
        "issues: invalid-price at row(s) 3",
    ]);
    const text = log.lines.join("\n");
    for (const value of ["TEST-0001", "TEST-0002", "Testmake", "AED 5,000", "Test status", "11111"]) {
      expect(text).not.toContain(value);
    }
  });

  it("ignores unknown/new columns and tolerates reordered columns", async () => {
    const header = ["Test secret column", ...[...EXPECTED_HEADER].reverse()];
    const sheet = new FakeSheet([syntheticRow({ "Test secret column": "PRIVATE-NEW-COLUMN-MARKER" })], header);
    const { snapshot, log } = await load(sheet);

    expect(snapshot.vehicles).toHaveLength(1);
    expect(sheet.requestedColumnNames()).not.toContain("Test secret column");
    expect(JSON.stringify(snapshot)).not.toContain("PRIVATE-NEW-COLUMN-MARKER");
    expect(log.lines[0]).toContain("1 unexpected column(s) (not read)");
    expect(log.lines.join("\n")).not.toContain("Test secret column");
  });

  it("returns an empty snapshot for a header-only sheet", async () => {
    const { snapshot } = await load(new FakeSheet([]));
    expect(snapshot.vehicles).toEqual([]);
  });

  it("does not parse formatted strings: formatted price text is ignored in favour of the effective value", async () => {
    const sheet = new FakeSheet([syntheticRow({ "Цена, AED": num(99999, "AED 1") })]);
    const { snapshot } = await load(sheet);
    expect(snapshot.vehicles[0].priceAed).toBe(99999);
  });

  it("drops duplicate and empty IDs", async () => {
    const sheet = new FakeSheet([
      syntheticRow({ ID: "TEST-DUP" }),
      syntheticRow({ ID: "TEST-DUP", Статус: "Продана" }),
      syntheticRow({ ID: "" }),
      syntheticRow({ ID: "TEST-0004" }),
    ]);
    const { snapshot, log } = await load(sheet);
    expect(snapshot.vehicles.map((v) => v.id)).toEqual(["TEST-0004"]);
    expect(log.lines[0]).toContain("duplicate-id at row(s) 2,3; missing-id at row(s) 4");
  });

  it("fails as invalid-data when a public column is missing", async () => {
    const header = EXPECTED_HEADER.filter((name) => name !== "Статус");
    await expect(load(new FakeSheet([syntheticRow()], header))).rejects.toMatchObject({
      name: "InventorySourceError",
      reason: "invalid-data",
      code: "missing-public-column",
    });
  });

  it("fails as source-error when the header changes between reads", async () => {
    const sheet = new FakeSheet([syntheticRow()]);
    sheet.onAfterHeader = () => {
      sheet.header = ["Test inserted column", ...EXPECTED_HEADER];
    };
    await expect(load(sheet)).rejects.toMatchObject({ reason: "source-error", code: "header-changed-during-read" });
  });

  it("fails when formatted and unformatted reads disagree on rows", async () => {
    const sheet = new FakeSheet([syntheticRow({ ID: { formatted: "TEST-0001", unformatted: "TEST-9999" } })]);
    await expect(load(sheet)).rejects.toBeInstanceOf(InventorySourceError);
    await expect(load(sheet)).rejects.toMatchObject({ code: "rows-changed-during-read" });
  });

  it("propagates reader failures without substituting data", async () => {
    const sheet = new FakeSheet([syntheticRow()]);
    sheet.readColumns = async () => {
      throw new InventorySourceError("source-error", "http-403");
    };
    await expect(load(sheet)).rejects.toMatchObject({ code: "http-403" });
  });
});
