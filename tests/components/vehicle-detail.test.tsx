import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { VehicleDetail } from "@/components/vehicle-detail";
import type { Vehicle } from "@/domain/vehicle";
import { syntheticAvailable, syntheticSold, syntheticSparse } from "../fixtures/vehicles";

afterEach(cleanup);

describe("VehicleDetail", () => {
  it("renders an available vehicle from public fields only", () => {
    render(<VehicleDetail locale="en" vehicle={syntheticAvailable} />);
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
    render(<VehicleDetail locale="en" vehicle={syntheticAvailable} />);
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
    render(<VehicleDetail locale="en" vehicle={syntheticAvailable} />);
    const heading = screen.getByRole("heading", { level: 1 }).parentElement as HTMLElement;
    expect(within(heading).getAllByRole("listitem").map((li) => li.textContent)).toEqual([
      "22,222 km",
      "Test spec",
      "Test gearbox",
    ]);
  });

  it("shows unmapped Sheet text verbatim, including Cyrillic, without translating it", () => {
    render(<VehicleDetail locale="en" vehicle={{ ...syntheticAvailable, transmission: "Тестовая коробка" }} />);
    expect(screen.getAllByText("Тестовая коробка").length).toBeGreaterThan(0);
  });

  it("renders the three WhatsApp actions for an available vehicle and no forms or phone links", () => {
    const { container } = render(<VehicleDetail locale="en" vehicle={syntheticAvailable} serverOrigin="https://site.test" />);
    const zone = screen.getByRole("region", { name: "Ask about this car" });
    expect(within(zone).getAllByRole("link").map((a) => a.textContent)).toEqual([
      "Chat on WhatsApp",
      "Request a viewing",
      "Request a test drive",
    ]);
    expect(container.querySelector("button, form, a[href^='tel:']")).toBeNull();
  });

  it("marks a sold vehicle as sold and offers no viewing or test-drive requests", () => {
    render(<VehicleDetail locale="en" vehicle={syntheticSold} />);
    expect(screen.getByText("Sold")).toBeDefined();
    expect(screen.getByText("This car has been sold.")).toBeDefined();
    expect(screen.queryByText(/AED/)).toBeNull();
    expect(screen.queryByText(/request a (viewing|test drive)/i)).toBeNull();
    expect(screen.getByRole("link", { name: "See cars in stock" }).getAttribute("href")).toBe("/cars");
  });

  it("gives a sold vehicle zero conversion actions and no sticky bar", () => {
    const { container } = render(<VehicleDetail locale="en" vehicle={syntheticSold} serverOrigin="https://site.test" />);
    expect(container.querySelectorAll("a[href*='wa.me']")).toHaveLength(0);
    expect(container.querySelector("[data-sticky-actions]")).toBeNull();
    expect(container.textContent).not.toMatch(/whatsapp|request a|didn.t find/i);
  });

  it("omits missing values instead of filling them in", () => {
    const { container } = render(<VehicleDetail locale="en" vehicle={syntheticSparse} />);
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
    const { container } = render(<VehicleDetail locale="en" vehicle={leaky} />);
    expect(container.innerHTML).not.toMatch(/PRIVATE-|99,?999/);
  });

  it("uses request wording only and never 'Book' or 'qualified lead'", () => {
    const { container } = render(<VehicleDetail locale="en" vehicle={syntheticAvailable} />);
    expect(container.textContent).not.toMatch(/\bbook\b|qualified lead/i);
  });
});
