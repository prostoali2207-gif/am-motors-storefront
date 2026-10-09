import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { NightShiftShowroom } from "@/components/night-shift-showroom";
import { syntheticAvailable, syntheticLongId, syntheticSold } from "../fixtures/vehicles";

afterEach(cleanup);

const vehicles = [syntheticAvailable, { ...syntheticLongId, make: "Anothermake" }];

describe("Night Shift showroom", () => {
  it("lists only public source vehicles, showing existing price and no fake photos", () => {
    const { container } = render(<NightShiftShowroom vehicles={vehicles} locale="en" serverOrigin="https://site.test" />);
    expect(screen.getByRole("heading", { level: 1, name: /ON THE LOT/ })).toBeDefined();
    expect(screen.getByRole("region", { name: "Available cars" })).toBeDefined();
    expect(screen.getByLabelText("2 cars available")).toBeDefined();
    expect(screen.getAllByText("AED 11,111").length).toBeGreaterThan(0);
    expect(container.querySelector(".ns-feature-image img")).toBeNull();
    expect(screen.getByText("Photos unavailable")).toBeDefined();
  });

  it("filters makes without sorting or dropping source order", () => {
    render(<NightShiftShowroom vehicles={vehicles} locale="en" serverOrigin="https://site.test" />);
    const all = screen.getByRole("list");
    expect(within(all).getAllByRole("listitem")).toHaveLength(2);
    const button = screen.getByRole("button", { name: "Anothermake" });
    fireEvent.click(button);
    expect(button.getAttribute("aria-pressed")).toBe("true");
    expect(within(all).getAllByRole("listitem")).toHaveLength(1);
    expect(screen.getByRole("link", { name: "View car ↗" }).getAttribute("href")).toBe("/cars/TEST-100000");
  });

  it("preserves WhatsApp prefill, VDP links and all three languages", () => {
    for (const locale of ["en", "ar", "ru"] as const) {
      const { container, unmount } = render(
        <NightShiftShowroom vehicles={vehicles} locale={locale} serverOrigin="https://site.test" />,
      );
      expect(container.querySelectorAll(".ns-row-go")).toHaveLength(2);
      const wa = container.querySelector<HTMLAnchorElement>(".ns-action-primary");
      expect(wa?.getAttribute("href")).toContain("wa.me/971503432337");
      const prefix = locale === "en" ? "" : "/" + locale;
      expect(container.querySelector(".ns-action-secondary")?.getAttribute("href")).toBe(prefix + "/cars/TEST-0001");
      unmount();
    }
  });

  it("keeps sold cars out of the available list and does not fabricate sales facts", () => {
    const { container } = render(
      <NightShiftShowroom vehicles={vehicles} locale="ru" serverOrigin={null} />,
    );
    expect(container.textContent).not.toContain(syntheticSold.id);
    expect(container.textContent).not.toMatch(/скидк|в рассрочк|кредит|покупателей/i);
  });
});
