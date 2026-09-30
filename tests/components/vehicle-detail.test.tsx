import { cleanup, render, screen, within } from "@testing-library/react";
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
    const spec = screen.getByRole("region", { name: "Specification" });
    expect(within(spec).getByText("22,222 km")).toBeDefined();
    expect(within(spec).getByText("Test gearbox")).toBeDefined();
    expect(screen.queryByText("Sold")).toBeNull();
  });

  it("lists the specification in the fixed order with the public reference last", () => {
    render(<VehicleDetail vehicle={syntheticAvailable} />);
    const spec = screen.getByRole("region", { name: "Specification" });
    expect(within(spec).getAllByRole("term").map((dt) => dt.textContent)).toEqual([
      "Mileage",
      "Regional spec",
      "Transmission",
      "Fuel",
      "Engine",
      "Drivetrain",
      "Year",
      "Colour",
      "Reference",
    ]);
    expect(within(spec).getAllByRole("definition").at(-1)?.textContent).toBe("TEST-0001");
  });

  it("summarises mileage, regional spec and transmission under the price", () => {
    render(<VehicleDetail vehicle={syntheticAvailable} />);
    const heading = screen.getByRole("heading", { level: 1 }).parentElement as HTMLElement;
    expect(within(heading).getAllByRole("listitem").map((li) => li.textContent)).toEqual([
      "22,222 km",
      "Test spec",
      "Test gearbox",
    ]);
  });

  it("shows Sheet text verbatim, including Cyrillic, without translating it", () => {
    render(<VehicleDetail vehicle={{ ...syntheticAvailable, transmission: "Тестовая коробка" }} />);
    expect(screen.getAllByText("Тестовая коробка").length).toBeGreaterThan(0);
  });

  it("renders no action area, buttons or contact links before Phase 5", () => {
    const { container } = render(<VehicleDetail vehicle={syntheticAvailable} />);
    expect(container.querySelector("button, form, a[href^='https://wa.me'], a[href^='tel:']")).toBeNull();
    expect(container.textContent).not.toMatch(/whatsapp|request a|didn.t find/i);
  });

  it("marks a sold vehicle as sold and offers no viewing or test-drive requests", () => {
    render(<VehicleDetail vehicle={syntheticSold} />);
    expect(screen.getByText("Sold")).toBeDefined();
    expect(screen.getByText("This car has been sold.")).toBeDefined();
    expect(screen.queryByText(/AED/)).toBeNull();
    expect(screen.queryByText(/request a (viewing|test drive)/i)).toBeNull();
    expect(screen.getByRole("link", { name: "See cars in stock" }).getAttribute("href")).toBe("/cars");
  });

  it("omits missing values instead of filling them in", () => {
    const { container } = render(<VehicleDetail vehicle={syntheticSparse} />);
    expect(screen.queryByText(/AED/)).toBeNull();
    expect(screen.queryByText(/km/)).toBeNull();
    expect(container.textContent).not.toMatch(/N\/A|unknown|on request/i);
    // Year and the public reference are the only rows left.
    expect(screen.getAllByRole("definition").map((dd) => dd.textContent)).toEqual(["2003", "TEST-0003"]);
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
