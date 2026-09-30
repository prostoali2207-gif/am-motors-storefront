import { describe, expect, it } from "vitest";

import { loadInventorySnapshot, type LoaderLog } from "@/adapters/google-sheets/loader";
import { EXPECTED_HEADER, NUMERIC_FIELDS, PUBLIC_COLUMNS } from "@/adapters/google-sheets/schema";
import { InventorySourceError } from "@/inventory/source-error";
import { FakeSheet, PRIVATE_MARKERS, syntheticRow } from "../../support/fake-sheet";

const NOW = Date.UTC(2026, 0, 15);

function recordingLog(): LoaderLog & { lines: string[] } {
  const lines: string[] = [];
  return { lines, info: (m) => lines.push(m), warn: (m) => lines.push(m) };
}

async function load(sheet: FakeSheet, log = recordingLog()) {
  const snapshot = await loadInventorySnapshot(sheet, { now: () => NOW, log });
  return { snapshot, log };
}

describe("loadInventorySnapshot: one batch data read", () => {
  it("reads all 14 public columns in exactly one batchGet after the header read", async () => {
    const sheet = new FakeSheet([syntheticRow()]);
    await load(sheet);

    expect(sheet.batchCalls).toHaveLength(1);
    expect(sheet.batchCalls[0]).toHaveLength(14);
    expect(sheet.requestedRanges[0]).toBe("'Машины'!1:1");
    expect(sheet.requestedColumnNames().sort()).toEqual(Object.values(PUBLIC_COLUMNS).sort());
  });

  it("reads only the 'Машины' tab and never requests private, server-only or unknown columns", async () => {
    const header = [...EXPECTED_HEADER, "Test secret column"];
    const sheet = new FakeSheet([syntheticRow({ "Test secret column": "PRIVATE-NEW-COLUMN-MARKER" })], header);
    await load(sheet);

    expect(sheet.requestedRanges.every((range) => range.startsWith("'Машины'!"))).toBe(true);
    const requested = sheet.requestedColumnNames();
    for (const column of [...Object.keys(PRIVATE_MARKERS), "Test secret column"]) {
      expect(requested).not.toContain(column);
    }
  });
});

describe("loadInventorySnapshot: values", () => {
  it("maps a synthetic Sheet into public vehicles", async () => {
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
        media: [],
      },
      expect.objectContaining({ id: "TEST-0002", status: "sold", priceAed: null }),
    ]);
  });

  it("keeps text cells as strings, as written", async () => {
    const sheet = new FakeSheet([
      syntheticRow({ Двигатель: "2.0 Test", Комплектация: "Test 007", ID: "TEST-000123" }),
    ]);
    const [vehicle] = (await load(sheet)).snapshot.vehicles;
    expect(vehicle.engine).toBe("2.0 Test");
    expect(vehicle.trim).toBe("Test 007");
    expect(vehicle.id).toBe("TEST-000123");
  });

  it("keeps year, price and mileage as numbers", async () => {
    const sheet = new FakeSheet([syntheticRow({ Год: 2003, "Цена, AED": 12345.5, "Пробег, км": 0 })]);
    const [vehicle] = (await load(sheet)).snapshot.vehicles;
    for (const field of NUMERIC_FIELDS) expect(typeof vehicle[field]).toBe("number");
    expect([vehicle.year, vehicle.priceAed, vehicle.mileageKm]).toEqual([2003, 12345.5, 0]);
  });

  it("never parses text in numeric columns", async () => {
    const sheet = new FakeSheet([syntheticRow({ "Цена, AED": "AED 11,111", "Пробег, км": "22,222 km" })]);
    const { snapshot, log } = await load(sheet);
    expect(snapshot.vehicles[0]).toMatchObject({ priceAed: null, mileageKm: null });
    expect(log.lines[0]).toContain("invalid-price at row(s) 2; invalid-mileage at row(s) 2");
  });

  it("omits and reports numbers typed into text columns instead of converting them", async () => {
    const sheet = new FakeSheet([syntheticRow({ Двигатель: 2 })]);
    const { snapshot, log } = await load(sheet);
    expect(snapshot.vehicles[0].engine).toBeNull();
    expect(log.lines[0]).toContain("non-text-value at row(s) 2");
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

  it("ignores unknown columns and tolerates reordered columns", async () => {
    const header = ["Test secret column", ...[...EXPECTED_HEADER].reverse()];
    const sheet = new FakeSheet([syntheticRow({ "Test secret column": "PRIVATE-NEW-COLUMN-MARKER" })], header);
    const { snapshot, log } = await load(sheet);

    expect(snapshot.vehicles).toHaveLength(1);
    expect(JSON.stringify(snapshot)).not.toContain("PRIVATE-NEW-COLUMN-MARKER");
    expect(log.lines[0]).toContain("1 unexpected column(s) (not read)");
    expect(log.lines.join("\n")).not.toContain("Test secret column");
  });

  it("returns an empty snapshot for a header-only sheet", async () => {
    const { snapshot } = await load(new FakeSheet([]));
    expect(snapshot.vehicles).toEqual([]);
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
});

describe("loadInventorySnapshot: header drift and concurrent edits", () => {
  it("fails as invalid-data when a public column is missing", async () => {
    const header = EXPECTED_HEADER.filter((name) => name !== "Статус");
    await expect(load(new FakeSheet([syntheticRow()], header))).rejects.toMatchObject({
      name: "InventorySourceError",
      reason: "invalid-data",
      code: "missing-public-column",
    });
  });

  it("fails closed when columns move between the header read and the data read", async () => {
    const sheet = new FakeSheet([syntheticRow()]);
    sheet.onAfterHeader = () => {
      sheet.header = ["Test inserted column", ...EXPECTED_HEADER];
    };
    await expect(load(sheet)).rejects.toMatchObject({ reason: "source-error", code: "header-changed-during-read" });
    expect(sheet.batchCalls).toHaveLength(1);
  });

  it("fails closed when a public column is renamed between the reads", async () => {
    const sheet = new FakeSheet([syntheticRow()]);
    sheet.onAfterHeader = () => {
      sheet.header = EXPECTED_HEADER.map((name) => (name === "Цена, AED" ? "Test price" : name));
    };
    await expect(load(sheet)).rejects.toBeInstanceOf(InventorySourceError);
  });

  it("does not claim to detect row-content edits: values all come from the one data read", async () => {
    // A row edit between the header read and the batchGet is not detectable by header checks.
    // The adapter does not pretend otherwise: every field of the vehicle reflects the single
    // batchGet response (never a mix of two data reads); the freshness window bounds staleness.
    const sheet = new FakeSheet([syntheticRow()]);
    sheet.onAfterHeader = () => {
      sheet.rows = [syntheticRow({ Статус: "Продана", "Цена, AED": 99999 })];
    };
    const { snapshot } = await load(sheet);
    expect(snapshot.vehicles).toEqual([expect.objectContaining({ status: "sold", priceAed: 99999 })]);
    expect(sheet.batchCalls).toHaveLength(1);
  });

  it("propagates reader failures without substituting data", async () => {
    const sheet = new FakeSheet([syntheticRow()]);
    sheet.readColumns = async () => {
      throw new InventorySourceError("source-error", "http-403");
    };
    await expect(load(sheet)).rejects.toMatchObject({ code: "http-403" });
  });
});
