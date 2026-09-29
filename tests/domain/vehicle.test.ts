import { describe, expect, it } from "vitest";

import { isVehicleStatus, PUBLIC_VEHICLE_FIELDS, VEHICLE_STATUSES, vehicleTitle } from "@/domain/vehicle";
import { syntheticAvailable, syntheticSold } from "../fixtures/vehicles";

describe("public Vehicle allowlist", () => {
  it("contains exactly the V1 public candidate fields", () => {
    expect([...PUBLIC_VEHICLE_FIELDS].sort()).toEqual(
      [
        "color",
        "drivetrain",
        "engine",
        "fuel",
        "id",
        "make",
        "mileageKm",
        "model",
        "priceAed",
        "regionalSpec",
        "status",
        "transmission",
        "trim",
        "year",
      ].sort(),
    );
  });

  it("has no private, pending, server-only or non-existent fields", () => {
    const forbidden = [
      "vin",
      "condition",
      "accidents",
      "serviceHistory",
      "owners",
      "mulkiyaUntil",
      "bankLien",
      "minPriceAed",
      "notes",
      "mediaLink",
      "postLink",
      "updatedAt",
      "bodyType",
      "interiorColor",
      "description",
    ];
    for (const field of forbidden) {
      expect(PUBLIC_VEHICLE_FIELDS as readonly string[]).not.toContain(field);
    }
  });

  it("fixtures carry only allowlisted keys", () => {
    for (const vehicle of [syntheticAvailable, syntheticSold]) {
      expect(Object.keys(vehicle).sort()).toEqual([...PUBLIC_VEHICLE_FIELDS].sort());
    }
  });
});

describe("VehicleStatus", () => {
  it("is limited to available and sold", () => {
    expect(VEHICLE_STATUSES).toEqual(["available", "sold"]);
  });

  it.each(["reserved", "Available", "В наличии", "Продана", "", null, undefined])(
    "rejects %s",
    (value) => {
      expect(isVehicleStatus(value)).toBe(false);
    },
  );
});

describe("vehicleTitle", () => {
  it("joins only the parts that exist", () => {
    expect(vehicleTitle(syntheticAvailable)).toBe("2001 Testmake Fixture Alpha Synthetic Trim");
    expect(vehicleTitle(syntheticSold)).toBe("2002 Testmake Fixture Beta");
  });
});
