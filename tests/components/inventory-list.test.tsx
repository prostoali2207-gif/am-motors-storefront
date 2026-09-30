import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { InventoryList } from "@/components/inventory-list";
import { syntheticAvailable, syntheticLongId } from "../fixtures/vehicles";

afterEach(cleanup);

describe("InventoryList", () => {
  it("renders available vehicles with links to their exact-ID detail pages", () => {
    render(<InventoryList result={{ kind: "ok", vehicles: [syntheticAvailable, syntheticLongId] }} headingLevel={2} />);
    const list = screen.getByRole("list", { name: "Available cars" });
    const links = within(list).getAllByRole("link");
    expect(links.map((a) => a.getAttribute("href"))).toEqual(["/cars/TEST-0001", "/cars/TEST-100000"]);
    expect(screen.getAllByText("AED 11,111")).toHaveLength(2);
    expect(screen.queryByText("Sold")).toBeNull();
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(2);
  });

  it("renders a distinct empty state", () => {
    render(<InventoryList result={{ kind: "empty" }} headingLevel={2} />);
    expect(screen.getByRole("heading", { name: "No cars are listed right now" })).toBeDefined();
    expect(screen.queryByText(/temporarily unavailable/i)).toBeNull();
  });

  it("renders unavailable truthfully, never as 'no cars'", () => {
    render(<InventoryList result={{ kind: "unavailable", reason: "not-configured" }} headingLevel={2} />);
    expect(screen.getByRole("heading", { name: "Inventory is temporarily unavailable" })).toBeDefined();
    expect(screen.queryByText(/no cars/i)).toBeNull();
  });
});
