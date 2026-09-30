import type { Vehicle } from "@/domain/vehicle";

/**
 * SYNTHETIC TEST DATA ONLY. Not real cars, not taken from the Sheet.
 * Every value is deliberately artificial ("Testmake", "TEST-…") so it can never be mistaken for
 * inventory, and the production-source guard test fails if these markers appear in `src/`.
 */
export const syntheticAvailable: Vehicle = {
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
};

export const syntheticSold: Vehicle = {
  id: "TEST-0002",
  status: "sold",
  make: "Testmake",
  model: "Fixture Beta",
  trim: null,
  year: 2002,
  priceAed: 33333,
  mileageKm: 44444,
  regionalSpec: null,
  color: null,
  engine: null,
  fuel: null,
  transmission: null,
  drivetrain: null,
};

/** An ID longer than the observed `AM-###` pattern — must remain valid. */
export const syntheticLongId: Vehicle = {
  ...syntheticAvailable,
  id: "TEST-100000",
  model: "Fixture Gamma",
};

/** All optional public fields empty — nothing may be filled in. */
export const syntheticSparse: Vehicle = {
  id: "TEST-0003",
  status: "available",
  make: "Testmake",
  model: "Fixture Delta",
  trim: null,
  year: 2003,
  priceAed: null,
  mileageKm: null,
  regionalSpec: null,
  color: null,
  engine: null,
  fuel: null,
  transmission: null,
  drivetrain: null,
};
