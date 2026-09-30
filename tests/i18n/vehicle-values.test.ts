import { describe, expect, it } from "vitest";

import { VEHICLE_VALUE_LABELS, displayVehicleValue } from "@/i18n/vehicle-values";

describe("localized display values for categorical Sheet values", () => {
  it("maps exactly the approved values", () => {
    expect(Object.keys(VEHICLE_VALUE_LABELS.transmission).sort()).toEqual(["CVT", "Автомат"].sort());
    expect(Object.keys(VEHICLE_VALUE_LABELS.fuel)).toEqual(["Бензин"]);
    expect(Object.keys(VEHICLE_VALUE_LABELS.drivetrain)).toEqual(["FWD"]);
    expect(Object.keys(VEHICLE_VALUE_LABELS.regionalSpec).sort()).toEqual(["American Specs", "GCC", "Korean Specs"].sort());
    expect(Object.keys(VEHICLE_VALUE_LABELS.color).sort()).toEqual(["Black", "Orange", "Red", "Silver", "White"]);
  });

  it.each([
    ["transmission", "Автомат", "Automatic", "أوتوماتيك", "Автомат"],
    ["transmission", "CVT", "CVT", "CVT", "Вариатор (CVT)"],
    ["fuel", "Бензин", "Petrol", "بنزين", "Бензин"],
    ["drivetrain", "FWD", "FWD", "دفع أمامي", "Передний (FWD)"],
    ["regionalSpec", "GCC", "GCC", "مواصفات خليجية", "GCC"],
    ["regionalSpec", "American Specs", "American Specs", "مواصفات أمريكية", "Американская спецификация"],
    ["regionalSpec", "Korean Specs", "Korean Specs", "مواصفات كورية", "Корейская спецификация"],
    ["color", "White", "White", "أبيض", "Белый"],
    ["color", "Silver", "Silver", "فضي", "Серебристый"],
    ["color", "Red", "Red", "أحمر", "Красный"],
    ["color", "Black", "Black", "أسود", "Чёрный"],
    ["color", "Orange", "Orange", "برتقالي", "Оранжевый"],
  ] as const)("%s %s → en %s / ar %s / ru %s", (field, value, en, ar, ru) => {
    expect(displayVehicleValue(field, value, "en")).toBe(en);
    expect(displayVehicleValue(field, value, "ar")).toBe(ar);
    expect(displayVehicleValue(field, value, "ru")).toBe(ru);
  });

  it("matches after trimming, like the status mapping", () => {
    expect(displayVehicleValue("fuel", "  Бензин ", "en")).toBe("Petrol");
  });

  it("shows an unknown value exactly as written, in every language (never guessed)", () => {
    for (const locale of ["en", "ar", "ru"] as const) {
      expect(displayVehicleValue("transmission", "Механика", locale)).toBe("Механика");
      expect(displayVehicleValue("fuel", "Test fuel", locale)).toBe("Test fuel");
      expect(displayVehicleValue("regionalSpec", "gcc", locale)).toBe("gcc"); // exact match only
      expect(displayVehicleValue("color", "Blue", locale)).toBe("Blue");
      expect(displayVehicleValue("color", "white", locale)).toBe("white"); // exact match only
      expect(displayVehicleValue("color", "Белый", locale)).toBe("Белый"); // never reverse-translated
    }
  });

  it("keeps missing values missing", () => {
    expect(displayVehicleValue("drivetrain", null, "ar")).toBeNull();
  });

  it("never resolves prototype members", () => {
    expect(displayVehicleValue("fuel", "constructor", "en")).toBe("constructor");
    expect(displayVehicleValue("fuel", "__proto__", "ru")).toBe("__proto__");
    expect(displayVehicleValue("fuel", "toString", "ar")).toBe("toString");
  });
});
