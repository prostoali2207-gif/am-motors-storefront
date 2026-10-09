import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { NightShiftShowroom } from "@/components/night-shift-showroom";
import type { VehicleImage } from "@/domain/vehicle-media";
import { syntheticAvailable, syntheticLongId, syntheticSold } from "../fixtures/vehicles";

afterEach(cleanup);

const vehicles = [syntheticAvailable, { ...syntheticLongId, make: "Anothermake" }];
const cover: VehicleImage = {
  id: "TESTMEDIA_COVER_000001",
  type: "image",
  src: "/media/TEST-0001/TESTMEDIA_COVER_000001/TESTREV00001",
};

describe("Night Shift photo-first catalog", () => {
  it("renders one complete photo-first card for every available car without preview selection", () => {
    const featured = { ...syntheticAvailable, media: [cover] };
    const { container } = render(
      <NightShiftShowroom vehicles={[featured, vehicles[1]]} locale="en" serverOrigin="https://site.test" />,
    );
    expect(screen.getByRole("heading", { level: 1, name: /ON THE LOT/ })).toBeDefined();
    expect(container.querySelector(".ns-stock-count")?.getAttribute("aria-label")).toBe("2 cars available");
    expect(container.querySelectorAll(".ns-photo-grid > li")).toHaveLength(2);
    expect(container.querySelectorAll(".ns-feature, .ns-select, .ns-arrows")).toHaveLength(0);
    expect(container.querySelectorAll(".ns-photo-card")).toHaveLength(2);
    expect(container.querySelectorAll(".ns-photo-card-media img")).toHaveLength(1);
    expect(container.querySelector(".ns-photo-card-media img")?.getAttribute("loading")).toBe("eager");
    expect(container.querySelector(".ns-photo-card-media img")?.getAttribute("alt")).toBe("");
    expect(container.querySelector(".ns-photo-card-media")?.getAttribute("href")).toBe("/cars/TEST-0001");
    expect(container.querySelectorAll(".ns-photo-card-actions .ns-card-whatsapp")).toHaveLength(2);
    expect(container.querySelectorAll(".ns-photo-card-actions .ns-card-view")).toHaveLength(2);
    expect(screen.getAllByText("AED 11,111")).toHaveLength(2);
  });

  it("does not invent images for cars without Website/ media", () => {
    const { container } = render(
      <NightShiftShowroom vehicles={vehicles} locale="ru" serverOrigin="https://site.test" />,
    );
    expect(container.querySelectorAll(".ns-photo-card-media img")).toHaveLength(0);
    expect(container.querySelectorAll(".ns-photo-card-unavailable")).toHaveLength(2);
    expect(screen.getAllByText("Фото недоступны")).toHaveLength(2);
    expect(container.innerHTML).not.toMatch(/placeholder\.jpg|unsplash|stockphoto/i);
  });

  it("filters by make, preserves source order and lets every card open its own detail page", () => {
    const { container } = render(
      <NightShiftShowroom vehicles={vehicles} locale="en" serverOrigin="https://site.test" />,
    );
    expect([...container.querySelectorAll(".ns-card-view")].map((link) => link.getAttribute("href")))
      .toEqual(["/cars/TEST-0001", "/cars/TEST-100000"]);
    const filter = screen.getByRole("button", { name: "Anothermake" });
    fireEvent.click(filter);
    expect(filter.getAttribute("aria-pressed")).toBe("true");
    expect(container.querySelectorAll(".ns-photo-grid > li")).toHaveLength(1);
    expect(container.querySelector(".ns-card-view")?.getAttribute("href")).toBe("/cars/TEST-100000");
  });

  it("preserves vehicle-specific WhatsApp prefills and VDP links in every locale", () => {
    for (const locale of ["en", "ar", "ru"] as const) {
      const { container, unmount } = render(
        <NightShiftShowroom vehicles={vehicles} locale={locale} serverOrigin="https://site.test" />,
      );
      const prefix = locale === "en" ? "" : "/" + locale;
      expect(container.querySelectorAll(".ns-card-whatsapp")).toHaveLength(2);
      const href = container.querySelector(".ns-card-whatsapp")?.getAttribute("href") ?? "";
      expect(href).toContain("wa.me/971503432337");
      expect(decodeURIComponent(href)).toContain("TEST-0001");
      expect(container.querySelector(".ns-card-view")?.getAttribute("href"))
        .toBe(prefix + "/cars/TEST-0001");
      unmount();
    }
  });

  it("omits sold records entirely, even if passed by mistake, with no sold WhatsApp buttons", () => {
    const { container } = render(
      <NightShiftShowroom vehicles={[...vehicles, syntheticSold]} locale="ru" serverOrigin={null} />,
    );
    expect(container.querySelectorAll(".ns-photo-grid > li")).toHaveLength(2);
    expect(container.querySelectorAll(".ns-card-whatsapp")).toHaveLength(2);
    expect(container.textContent).not.toContain(syntheticSold.id);
    expect(container.textContent).not.toMatch(/скидк|в рассрочк|кредит|покупателей/i);
  });
});
