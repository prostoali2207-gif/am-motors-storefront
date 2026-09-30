import { describe, expect, it } from "vitest";

import { checkHeader, columnLetter, columnRange, headerRange } from "@/adapters/google-sheets/header";
import { EXPECTED_HEADER } from "@/adapters/google-sheets/schema";

describe("checkHeader", () => {
  it("locates public columns in the confirmed snapshot", () => {
    const result = checkHeader([...EXPECTED_HEADER]);
    expect(result).toMatchObject({ ok: true, unexpectedColumnCount: 0, missingSnapshotColumns: [] });
    if (!result.ok) throw new Error("expected ok");
    expect(result.positions.id).toBe(0);
    expect(result.positions.priceAed).toBe(5);
    expect(result.positions.drivetrain).toBe(13);
  });

  it("finds columns by name regardless of order and ignores unknown columns", () => {
    const header = ["Test new column", ...[...EXPECTED_HEADER].reverse(), " "];
    const result = checkHeader(header);
    if (!result.ok) throw new Error("expected ok");
    expect(result.positions.id).toBe(EXPECTED_HEADER.length);
    expect(result.unexpectedColumnCount).toBe(1);
  });

  it("reports removed non-public snapshot columns without failing", () => {
    const result = checkHeader(EXPECTED_HEADER.filter((name) => name !== "Заметки"));
    expect(result).toMatchObject({ ok: true, missingSnapshotColumns: ["Заметки"] });
  });

  it("fails when a public column is missing or renamed", () => {
    const header = EXPECTED_HEADER.map((name) => (name === "Цена, AED" ? "Цена" : name));
    expect(checkHeader(header)).toEqual({ ok: false, problem: "missing-public-column", columns: ["Цена, AED"] });
  });

  it("fails when a public column appears twice", () => {
    expect(checkHeader([...EXPECTED_HEADER, "Статус"])).toEqual({
      ok: false,
      problem: "duplicate-public-column",
      columns: ["Статус"],
    });
  });

  it("fails on an empty header", () => {
    expect(checkHeader([])).toMatchObject({ ok: false, problem: "missing-public-column" });
  });
});

describe("A1 ranges", () => {
  it.each([
    [0, "A"],
    [13, "N"],
    [25, "Z"],
    [26, "AA"],
    [701, "ZZ"],
    [702, "AAA"],
  ])("column %i is %s", (index, letters) => {
    expect(columnLetter(index)).toBe(letters);
  });

  it("builds quoted tab ranges", () => {
    expect(headerRange("Машины")).toBe("'Машины'!1:1");
    expect(columnRange("Машины", 5)).toBe("'Машины'!F1:F");
    expect(columnRange("It's", 0)).toBe("'It''s'!A1:A");
  });
});
