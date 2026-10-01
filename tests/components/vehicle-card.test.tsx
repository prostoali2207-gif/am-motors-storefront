import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { InventoryPageHeader } from "@/components/inventory-page-header";
import { InventoryList } from "@/components/inventory-list";
import { VehicleCard } from "@/components/vehicle-card";
import type { VehicleImage } from "@/domain/vehicle-media";
import { syntheticAvailable, syntheticLongId, syntheticSold, syntheticSparse } from "../fixtures/vehicles";

afterEach(cleanup);

/** Obviously fake same-origin media paths (no file exists). */
const syntheticMedia: VehicleImage[] = [
  { id: "TESTMEDIA_COVER_000001", type: "image", src: "/media/TEST-0001/TESTMEDIA_COVER_000001/TESTREV00001" },
  { id: "TESTMEDIA_SECOND_00002", type: "image", src: "/media/TEST-0001/TESTMEDIA_SECOND_00002/TESTREV00002" },
];

describe("VehicleCard", () => {
  it("gives the card link the full title while showing make · year as a visual eyebrow", () => {
    render(<VehicleCard locale="en" vehicle={syntheticAvailable} headingLevel={2} />);
    const link = screen.getByRole("link", { name: "2001 Testmake Fixture Alpha Synthetic Trim" });
    expect(link.getAttribute("href")).toBe("/cars/TEST-0001");
    expect(screen.getByText("Testmake · 2001").closest("p")?.getAttribute("aria-hidden")).toBe("true");
  });

  it("shows price, then mileage, regional spec and transmission in that order", () => {
    render(<VehicleCard locale="en" vehicle={syntheticAvailable} headingLevel={2} />);
    expect(screen.getByText("AED 11,111")).toBeDefined();
    expect(screen.getAllByRole("listitem").map((li) => li.textContent)).toEqual([
      "22,222 km",
      "Test spec",
      "Test gearbox",
    ]);
  });

  it("without an approved photo renders the text-only card: no image box or placeholder", () => {
    const { container } = render(<VehicleCard locale="en" vehicle={syntheticAvailable} headingLevel={2} />);
    expect(container.querySelector("img, picture, video, [class*='media'], [class*='frame']")).toBeNull();
  });

  it("shows exactly one cover (the first image) above the eyebrow, lazy unless asked", () => {
    const vehicle = { ...syntheticAvailable, media: syntheticMedia };
    const { container } = render(<VehicleCard locale="en" vehicle={vehicle} headingLevel={2} />);
    const images = container.querySelectorAll("img");
    expect(images).toHaveLength(1);
    expect(images[0].getAttribute("src")).toContain(encodeURIComponent(syntheticMedia[0].src));
    expect(images[0].getAttribute("alt")).toBe("");
    expect(images[0].getAttribute("loading")).toBe("lazy");
    const frame = container.querySelector(".card-media");
    expect(frame?.nextElementSibling?.classList.contains("card-eyebrow")).toBe(true);
    expect(container.querySelector("video")).toBeNull();
  });

  it("loads the first card's cover eagerly", () => {
    const vehicle = { ...syntheticAvailable, media: syntheticMedia };
    const { container } = render(<VehicleCard locale="en" vehicle={vehicle} headingLevel={2} eagerCover />);
    expect(container.querySelector("img")?.getAttribute("loading")).toBe("eager");
  });

  it("ignores videos: a video-only media list is the text-only card", () => {
    const vehicle = { ...syntheticAvailable, media: [{ id: "TESTVIDEO", type: "video" as const }] };
    const { container } = render(<VehicleCard locale="en" vehicle={vehicle} headingLevel={2} />);
    expect(container.querySelector("img, video, .card-media")).toBeNull();
  });

  it("omits missing values instead of filling them in", () => {
    const { container } = render(<VehicleCard locale="en" vehicle={syntheticSparse} headingLevel={2} />);
    expect(container.querySelector("ul")).toBeNull();
    expect(container.textContent).not.toMatch(/AED|km|N\/A|on request/i);
  });

  it("never shows a price on a sold card and marks it Sold", () => {
    render(<VehicleCard locale="en" vehicle={syntheticSold} headingLevel={2} />);
    expect(screen.getByText("Sold")).toBeDefined();
    expect(screen.queryByText(/AED/)).toBeNull();
  });
});

describe("InventoryList order", () => {
  it("keeps the repository/source order (no sorting)", () => {
    render(<InventoryList locale="en" result={{ kind: "ok", vehicles: [syntheticLongId, syntheticAvailable] }} headingLevel={2} />);
    expect(screen.getAllByRole("link").map((a) => a.getAttribute("href"))).toEqual(["/cars/TEST-100000", "/cars/TEST-0001"]);
  });
});

describe("InventoryPageHeader", () => {
  it("counts what the source returned, with correct singular/plural", () => {
    const { rerender } = render(<InventoryPageHeader locale="en" title="Cars in stock" result={{ kind: "ok", vehicles: [syntheticAvailable] }} />);
    expect(screen.getByText("1 car available")).toBeDefined();
    rerender(<InventoryPageHeader locale="en" title="Cars in stock" result={{ kind: "ok", vehicles: [syntheticAvailable, syntheticLongId] }} />);
    expect(screen.getByText("2 cars available")).toBeDefined();
  });

  it("shows no count when inventory is empty or unavailable", () => {
    const { container, rerender } = render(<InventoryPageHeader locale="en" title="Cars in stock" result={{ kind: "empty" }} />);
    expect(container.textContent).toBe("Cars in stock");
    rerender(<InventoryPageHeader locale="en" title="Cars in stock" result={{ kind: "unavailable", reason: "source-error" }} />);
    expect(container.textContent).toBe("Cars in stock");
  });
});
