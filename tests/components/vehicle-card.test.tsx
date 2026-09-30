import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { InventoryPageHeader } from "@/components/inventory-page-header";
import { InventoryList } from "@/components/inventory-list";
import { VehicleCard } from "@/components/vehicle-card";
import { syntheticAvailable, syntheticLongId, syntheticSold, syntheticSparse } from "../fixtures/vehicles";

afterEach(cleanup);

describe("VehicleCard", () => {
  it("gives the card link the full title while showing make · year as a visual eyebrow", () => {
    render(<VehicleCard vehicle={syntheticAvailable} headingLevel={2} />);
    const link = screen.getByRole("link", { name: "2001 Testmake Fixture Alpha Synthetic Trim" });
    expect(link.getAttribute("href")).toBe("/cars/TEST-0001");
    expect(screen.getByText("Testmake · 2001").getAttribute("aria-hidden")).toBe("true");
  });

  it("shows price, then mileage, regional spec and transmission in that order", () => {
    render(<VehicleCard vehicle={syntheticAvailable} headingLevel={2} />);
    expect(screen.getByText("AED 11,111")).toBeDefined();
    expect(screen.getAllByRole("listitem").map((li) => li.textContent)).toEqual([
      "22,222 km",
      "Test spec",
      "Test gearbox",
    ]);
  });

  it("has no image box or placeholder while listings have no media", () => {
    const { container } = render(<VehicleCard vehicle={syntheticAvailable} headingLevel={2} />);
    expect(container.querySelector("img, picture, video, [class*='media'], [class*='frame']")).toBeNull();
  });

  it("omits missing values instead of filling them in", () => {
    const { container } = render(<VehicleCard vehicle={syntheticSparse} headingLevel={2} />);
    expect(container.querySelector("ul")).toBeNull();
    expect(container.textContent).not.toMatch(/AED|km|N\/A|on request/i);
  });

  it("never shows a price on a sold card and marks it Sold", () => {
    render(<VehicleCard vehicle={syntheticSold} headingLevel={2} />);
    expect(screen.getByText("Sold")).toBeDefined();
    expect(screen.queryByText(/AED/)).toBeNull();
  });
});

describe("InventoryList order", () => {
  it("keeps the repository/source order (no sorting)", () => {
    render(<InventoryList result={{ kind: "ok", vehicles: [syntheticLongId, syntheticAvailable] }} headingLevel={2} />);
    expect(screen.getAllByRole("link").map((a) => a.getAttribute("href"))).toEqual(["/cars/TEST-100000", "/cars/TEST-0001"]);
  });
});

describe("InventoryPageHeader", () => {
  it("counts what the source returned, with correct singular/plural", () => {
    const { rerender } = render(<InventoryPageHeader title="Cars in stock" result={{ kind: "ok", vehicles: [syntheticAvailable] }} />);
    expect(screen.getByText("1 car available")).toBeDefined();
    rerender(<InventoryPageHeader title="Cars in stock" result={{ kind: "ok", vehicles: [syntheticAvailable, syntheticLongId] }} />);
    expect(screen.getByText("2 cars available")).toBeDefined();
  });

  it("shows no count when inventory is empty or unavailable", () => {
    const { container, rerender } = render(<InventoryPageHeader title="Cars in stock" result={{ kind: "empty" }} />);
    expect(container.textContent).toBe("Cars in stock");
    rerender(<InventoryPageHeader title="Cars in stock" result={{ kind: "unavailable", reason: "source-error" }} />);
    expect(container.textContent).toBe("Cars in stock");
  });
});
