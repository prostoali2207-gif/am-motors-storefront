import { afterEach, describe, expect, it, vi } from "vitest";

import { recordWhatsAppClick } from "@/analytics/whatsapp-click";
import {
  activateGoogleAdsMeasurement, ADS_CONSENT_STORAGE_KEY,
  reportGoogleAdsWhatsAppClick, resetGoogleAdsMeasurementForTests,
} from "@/analytics/google-ads-measurement";
import { parseGoogleAdsConfig } from "@/lib/google-ads-config";

afterEach(() => {
  vi.unstubAllGlobals();
  resetGoogleAdsMeasurementForTests();
});

describe("WhatsApp click instrumentation", () => {
  it("records a vehicle click without visitor information or VIN", () => {
    const dataLayer: Record<string, string>[] = [];
    vi.stubGlobal("window", { location: { pathname: "/cars/TEST-123" }, dataLayer });
    recordWhatsAppClick({
      kind: "vehicle", intent: "viewing", id: "TEST-123",
      title: "Testmake Testcar", path: "/cars/TEST-123", locale: "en",
    });
    expect(dataLayer).toEqual([{
      event: "am_whatsapp_click", inquiry_type: "viewing",
      page_path: "/cars/TEST-123", vehicle_id: "TEST-123",
    }]);
  });

  it("records general requests separately", () => {
    const browser = { location: { pathname: "/ru/cars" }, dataLayer: [] as object[] };
    vi.stubGlobal("window", browser);
    recordWhatsAppClick({ kind: "general", locale: "ru" });
    expect(browser.dataLayer).toEqual([{
      event: "am_whatsapp_click", inquiry_type: "general", page_path: "/ru/cars",
    }]);
  });

  it("does not transmit to Google Ads before explicit opt-in", () => {
    const browser = { dataLayer: [] as unknown[] };
    vi.stubGlobal("window", browser);
    expect(reportGoogleAdsWhatsAppClick()).toBe(false);
    expect(browser.dataLayer).toEqual([]);
  });

  it("rejects missing and malformed conversion identifiers", () => {
    expect(parseGoogleAdsConfig(undefined, "Label_ABC")).toBeNull();
    expect(parseGoogleAdsConfig("AW-123456", undefined)).toBeNull();
    expect(parseGoogleAdsConfig("AW-abc", "Label_ABC")).toBeNull();
    expect(parseGoogleAdsConfig("AW-123456", "../bad")).toBeNull();
    expect(parseGoogleAdsConfig("AW-123456", "Label_ABC")).toEqual({
      tagId: "AW-123456", label: "Label_ABC",
    });
  });

  it("buffers one conversion event only after opt-in and loads the tag once", () => {
    const browser = { dataLayer: [] as unknown[] };
    const scripts: { async?: boolean; src?: string; nonce?: string }[] = [];
    vi.stubGlobal("window", browser);
    vi.stubGlobal("document", {
      head: { appendChild: (script: object) => scripts.push(script) },
      createElement: () => ({}),
      querySelector: () => null,
    });
    expect(activateGoogleAdsMeasurement("invalid", "Label_ABC")).toBe(false);
    expect(scripts).toHaveLength(0);
    expect(activateGoogleAdsMeasurement("AW-123456", "Label_ABC")).toBe(true);
    expect(activateGoogleAdsMeasurement("AW-123456", "Label_ABC")).toBe(true);
    expect(scripts).toHaveLength(1);
    expect(scripts[0]?.src).toBe("https://www.googletagmanager.com/gtag/js?id=AW-123456");
    expect(reportGoogleAdsWhatsAppClick()).toBe(true);
    expect(browser.dataLayer.at(-1)).toEqual([
      "event", "conversion", { send_to: "AW-123456/Label_ABC" },
    ]);
    expect(JSON.stringify(browser.dataLayer)).not.toContain("Testmake");
    expect(ADS_CONSENT_STORAGE_KEY).toBe("am-motors:ads-consent:v1");
  });
});
