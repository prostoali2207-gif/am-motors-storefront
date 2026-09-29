import { describe, expect, it } from "vitest";

import { isUsableVehicleId, keepUniquelyIdentified, vehiclePath } from "@/domain/vehicle-id";

describe("isUsableVehicleId", () => {
  it.each(["TEST-1", "TEST-0001", "TEST-100000", "AM-1000", "x"])("accepts %s (no strict format)", (id) => {
    expect(isUsableVehicleId(id)).toBe(true);
  });

  it.each(["", "   ", null, undefined, 42])("rejects %s", (id) => {
    expect(isUsableVehicleId(id)).toBe(false);
  });
});

describe("keepUniquelyIdentified", () => {
  it("drops every record that shares a duplicated ID and records with empty IDs", () => {
    const { kept, rejectedIds } = keepUniquelyIdentified([
      { id: "TEST-1" },
      { id: "TEST-2" },
      { id: "TEST-2" },
      { id: "" },
    ]);
    expect(kept).toEqual([{ id: "TEST-1" }]);
    expect(rejectedIds.sort()).toEqual(["(empty)", "TEST-2"]);
  });

  it("treats IDs verbatim (case and whitespace are significant)", () => {
    const { kept } = keepUniquelyIdentified([{ id: "TEST-1" }, { id: "test-1" }, { id: "TEST-1 " }]);
    expect(kept).toHaveLength(3);
  });
});

describe("vehiclePath", () => {
  it("uses the ID verbatim, URL-encoded only where required", () => {
    expect(vehiclePath("TEST-0001")).toBe("/cars/TEST-0001");
    expect(vehiclePath("TEST 1/2")).toBe("/cars/TEST%201%2F2");
  });
});
