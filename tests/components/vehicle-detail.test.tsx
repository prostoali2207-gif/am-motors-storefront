import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { VehicleDetail } from "@/components/vehicle-detail";
import type { Vehicle } from "@/domain/vehicle";
import { syntheticAvailable, syntheticSold, syntheticSparse } from "../fixtures/vehicles";

afterEach(cleanup);

describe("VehicleDetail", () => {
  it("renders an available vehicle from public fields only", () => {
    render(<VehicleDetail vehicle={syntheticAvailable} />);
    expect(
      screen.getByRole("heading", { level: 1, name: "2001 Testmake Fixture Alpha Synthetic Trim" }),
    ).toBeDefined();
    expect(screen.getByText("AED 11,111")).toBeDefined();
    expect(screen.getByText("22,222 km")).toBeDefined();
    expect(screen.getByText("Test gearbox")).toBeDefined();
    expect(screen.queryByText("Sold")).toBeNull();
  });

  it("marks a sold vehicle as sold and offers no viewing or test-drive requests", () => {
    render(<VehicleDetail vehicle={syntheticSold} />);
    expect(screen.getByText("Sold")).toBeDefined();
    expect(screen.getByText("This car has been sold.")).toBeDefined();
    expect(screen.queryByText(/AED/)).toBeNull();
    expect(screen.queryByText(/request a (viewing|test drive)/i)).toBeNull();
    expect(screen.getByRole("link", { name: "See available cars" }).getAttribute("href")).toBe("/cars");
  });

  it("omits missing values instead of filling them in", () => {
    const { container } = render(<VehicleDetail vehicle={syntheticSparse} />);
    expect(screen.queryByText(/AED/)).toBeNull();
    expect(screen.queryByText(/km/)).toBeNull();
    expect(container.textContent).not.toMatch(/N\/A|unknown|on request/i);
    // Year is the only fact left.
    expect(screen.getAllByRole("definition").map((dd) => dd.textContent)).toEqual(["2003"]);
  });

  it("never renders fields outside the allowlist, even if an object carries them", () => {
    const leaky = {
      ...syntheticAvailable,
      vin: "PRIVATE-VIN-MARKER",
      minPriceAed: 99999,
      notes: "PRIVATE-NOTES-MARKER",
    } as Vehicle;
    const { container } = render(<VehicleDetail vehicle={leaky} />);
    expect(container.innerHTML).not.toMatch(/PRIVATE-|99,?999/);
  });

  it("uses request wording only and never 'Book' or 'qualified lead'", () => {
    const { container } = render(<VehicleDetail vehicle={syntheticAvailable} />);
    expect(container.textContent).not.toMatch(/\bbook\b|qualified lead/i);
  });
});
