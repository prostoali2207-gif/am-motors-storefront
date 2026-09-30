import { describe, expect, it } from "vitest";

import { mapRows, mapStatus, type SourceRow } from "@/adapters/google-sheets/mapping";
import { PUBLIC_FIELDS, type PublicField } from "@/adapters/google-sheets/schema";
import { PUBLIC_VEHICLE_FIELDS } from "@/domain/vehicle";

const YEAR = 2026;

/** Synthetic row as the API would return it for the allowlisted columns. */
function row(rowNumber: number, overrides: Partial<Record<PublicField, unknown>> = {}): SourceRow {
  return {
    rowNumber,
    cells: {
      id: `TEST-${String(rowNumber).padStart(4, "0")}`,
      make: "Testmake",
      model: "Fixture Alpha",
      trim: "Synthetic Trim",
      year: 2001,
      priceAed: 11111,
      status: "В наличии",
      mileageKm: 22222,
      regionalSpec: "Test spec",
      color: "Test color",
      engine: "Test engine",
      fuel: "Test fuel",
      transmission: "Test gearbox",
      drivetrain: "Test drive",
      ...overrides,
    },
  };
}

describe("mapRows: field-by-field mapping", () => {
  it("maps every allowlisted column to its public field", () => {
    const { vehicles, issues } = mapRows([row(2)], YEAR);
    expect(issues).toEqual([]);
    expect(vehicles).toEqual([
      {
        id: "TEST-0002",
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
    ]);
  });

  it("produces objects with exactly the public allowlist keys", () => {
    const { vehicles } = mapRows([row(2), row(3, { status: "Продана" })], YEAR);
    for (const vehicle of vehicles) {
      expect(Object.keys(vehicle).sort()).toEqual([...PUBLIC_VEHICLE_FIELDS].sort());
    }
    // Every public field except `media` (resolved from Drive, not a Sheet column) is Sheet-backed.
    expect([...PUBLIC_FIELDS, "media"].sort()).toEqual([...PUBLIC_VEHICLE_FIELDS].sort());
  });

  it("normalizes whitespace in text but otherwise keeps values as written", () => {
    const { vehicles } = mapRows([row(2, { make: "  Test\n make ", engine: "2.0  test" })], YEAR);
    expect(vehicles[0].make).toBe("Test make");
    expect(vehicles[0].engine).toBe("2.0 test");
  });
});

describe("mapRows: status mapping (fail closed)", () => {
  it.each([
    ["В наличии", "available"],
    ["Продана", "sold"],
    ["  В наличии  ", "available"],
  ])("maps %j to %s", (value, expected) => {
    expect(mapStatus(value)).toBe(expected);
  });

  it.each(["", "в наличии", "ПРОДАНА", "Test status", "Reserved", "available", "constructor", null, 1])(
    "treats %j as not public",
    (value) => {
      expect(mapStatus(value)).toBeNull();
      const result = mapRows([row(2, { status: value })], YEAR);
      expect(result.vehicles).toEqual([]);
      expect(result.nonPublicStatusCount).toBe(1);
    },
  );
});

describe("mapRows: numeric effective values", () => {
  it("accepts numeric cells for price and mileage", () => {
    const { vehicles } = mapRows([row(2, { priceAed: 12345.5, mileageKm: 0 })], YEAR);
    expect(vehicles[0].priceAed).toBe(12345.5);
    expect(vehicles[0].mileageKm).toBe(0);
  });

  it.each(["AED 11,111", "11111", "11,111 AED", -5, 0, Number.NaN, true])(
    "never parses or accepts price %j (field omitted, row kept, issue reported)",
    (value) => {
      const { vehicles, issues } = mapRows([row(2, { priceAed: value })], YEAR);
      expect(vehicles).toHaveLength(1);
      expect(vehicles[0].priceAed).toBeNull();
      expect(issues).toEqual([{ rowNumber: 2, code: "invalid-price" }]);
    },
  );

  it.each(["22,222 km", "22222", -1, Number.POSITIVE_INFINITY])("rejects mileage %j", (value) => {
    const { vehicles, issues } = mapRows([row(2, { mileageKm: value })], YEAR);
    expect(vehicles[0].mileageKm).toBeNull();
    expect(issues).toEqual([{ rowNumber: 2, code: "invalid-mileage" }]);
  });

  it.each(["2001", 2001.5, 1899, YEAR + 2, undefined])("drops the row for invalid year %j", (value) => {
    const { vehicles, issues } = mapRows([row(2, { year: value })], YEAR);
    expect(vehicles).toEqual([]);
    expect(issues).toEqual([{ rowNumber: 2, code: "invalid-year" }]);
  });

  it("accepts next model year", () => {
    expect(mapRows([row(2, { year: YEAR + 1 })], YEAR).vehicles).toHaveLength(1);
  });
});

describe("mapRows: missing fields", () => {
  it("omits missing optional fields as null and never fills them", () => {
    const { vehicles, issues } = mapRows(
      [
        row(2, {
          trim: "",
          priceAed: "",
          mileageKm: undefined,
          regionalSpec: undefined,
          color: "   ",
          engine: undefined,
          fuel: "",
          transmission: undefined,
          drivetrain: undefined,
        }),
      ],
      YEAR,
    );
    expect(issues).toEqual([]);
    expect(vehicles[0]).toMatchObject({
      trim: null,
      priceAed: null,
      mileageKm: null,
      regionalSpec: null,
      color: null,
      engine: null,
      fuel: null,
      transmission: null,
      drivetrain: null,
    });
  });

  it("omits and reports non-text values in optional text fields", () => {
    const { vehicles, issues } = mapRows([row(2, { engine: 2, color: true })], YEAR);
    expect(vehicles[0]).toMatchObject({ engine: null, color: null });
    expect(issues).toEqual([
      { rowNumber: 2, code: "non-text-value" },
      { rowNumber: 2, code: "non-text-value" },
    ]);
  });

  it("drops rows without make or model", () => {
    const { vehicles, issues } = mapRows([row(2, { make: " " }), row(3, { model: undefined })], YEAR);
    expect(vehicles).toEqual([]);
    expect(issues).toEqual([
      { rowNumber: 2, code: "missing-make" },
      { rowNumber: 3, code: "missing-model" },
    ]);
  });

  it("skips fully blank rows silently", () => {
    const blank: SourceRow = { rowNumber: 3, cells: Object.fromEntries(PUBLIC_FIELDS.map((f) => [f, ""])) as SourceRow["cells"] };
    const { vehicles, issues } = mapRows([row(2), blank], YEAR);
    expect(vehicles).toHaveLength(1);
    expect(issues).toEqual([]);
  });
});

describe("mapRows: ID rules", () => {
  it("uses the ID verbatim without a format regex", () => {
    const { vehicles } = mapRows([row(2, { id: "TEST-100000" }), row(3, { id: "test id/ä" })], YEAR);
    expect(vehicles.map((v) => v.id)).toEqual(["TEST-100000", "test id/ä"]);
  });

  it("drops rows with an empty ID", () => {
    const { vehicles, issues } = mapRows([row(2, { id: "" }), row(3, { id: "  " }), row(4, { id: undefined })], YEAR);
    expect(vehicles).toEqual([]);
    expect(issues.map((i) => i.code)).toEqual(["missing-id", "missing-id", "missing-id"]);
  });

  it("drops every row sharing a duplicated ID, whatever the status", () => {
    const { vehicles, issues } = mapRows(
      [
        row(2, { id: "TEST-DUP" }),
        row(3, { id: "TEST-DUP", status: "Продана" }),
        row(4, { id: "TEST-DUP", status: "Test status" }),
        row(5, { id: "TEST-0005" }),
      ],
      YEAR,
    );
    expect(vehicles.map((v) => v.id)).toEqual(["TEST-0005"]);
    expect(issues).toEqual([
      { rowNumber: 2, code: "duplicate-id" },
      { rowNumber: 3, code: "duplicate-id" },
      { rowNumber: 4, code: "duplicate-id" },
    ]);
  });
});
