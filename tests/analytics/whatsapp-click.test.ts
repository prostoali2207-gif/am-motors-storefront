import { afterEach, describe, expect, it, vi } from "vitest";

import { recordWhatsAppClick } from "@/analytics/whatsapp-click";

afterEach(() => vi.unstubAllGlobals());

describe("WhatsApp click instrumentation", () => {
  it("records a vehicle click without visitor information or VIN", () => {
    const dataLayer: Record<string, string>[] = [];
    vi.stubGlobal("window", { location: { pathname: "/cars/AM-123" }, dataLayer });
    recordWhatsAppClick({
      kind: "vehicle", intent: "viewing", id: "AM-123",
      title: "Testmake Testcar", path: "/cars/AM-123", locale: "en",
    });
    expect(dataLayer).toEqual([{
      event: "am_whatsapp_click",
      inquiry_type: "viewing",
      page_path: "/cars/AM-123",
      vehicle_id: "AM-123",
    }]);
  });

  it("records general requests separately and does not infer a car", () => {
    const browser = { location: { pathname: "/ru/cars" }, dataLayer: [] as object[] };
    vi.stubGlobal("window", browser);
    recordWhatsAppClick({ kind: "general", locale: "ru" });
    expect(browser.dataLayer).toEqual([{
      event: "am_whatsapp_click",
      inquiry_type: "general",
      page_path: "/ru/cars",
    }]);
  });
});
