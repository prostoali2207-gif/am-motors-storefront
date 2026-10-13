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

  it("in Advanced mode loads with consent denied and keeps limited click measurement after rejection", () => {
    const browser = { dataLayer: [] as unknown[] };
    const scripts: { src?: string }[] = [];
    vi.stubGlobal("window", browser);
    vi.stubGlobal("document", {
      head: { appendChild: (script: object) => scripts.push(script) },
      createElement: () => ({}),
      querySelector: () => null,
    });

    // Do not imply that rejected consent prevents all Google network traffic.
    expect(activateGoogleAdsMeasurement("AW-123456", "Label_ABC", false)).toBe(true);
    expect(scripts).toHaveLength(1);
    const commands = () => (browser.dataLayer as IArguments[]).map((cmd) => Array.from(cmd));
    expect(commands().map((c) => c.slice(0, 2))).toEqual([
      ["consent", "default"], ["set", "ads_data_redaction"],
      ["js", expect.any(Date)], ["config", "AW-123456"],
    ]);
    expect(commands()[0]?.[2]).toEqual({
      ad_storage: "denied", analytics_storage: "denied",
      ad_user_data: "denied", ad_personalization: "denied",
    });
    expect(reportGoogleAdsWhatsAppClick()).toBe(true);
    expect(commands().at(-1)).toEqual([
      "event", "conversion", { send_to: "AW-123456/Label_ABC" },
    ]);

    // Opt-in and withdrawal change only storage consent; same tag stays loaded.
    expect(activateGoogleAdsMeasurement("AW-123456", "Label_ABC", true)).toBe(true);
    expect(commands().at(-1)?.[0]).toBe("consent");
    expect(commands().at(-1)?.[2]).toEqual({
      ad_storage: "granted", analytics_storage: "denied",
      ad_user_data: "denied", ad_personalization: "denied",
    });
    expect(activateGoogleAdsMeasurement("AW-123456", "Label_ABC", false)).toBe(true);
    expect(commands().at(-1)?.[2]).toEqual({
      ad_storage: "denied", analytics_storage: "denied",
      ad_user_data: "denied", ad_personalization: "denied",
    });
    const count = commands().length;
    expect(activateGoogleAdsMeasurement("AW-123456", "Label_ABC", false)).toBe(true);
    expect(commands()).toHaveLength(count);
    expect(scripts).toHaveLength(1);
    expect(activateGoogleAdsMeasurement("AW-222222", "Label_ABC", false)).toBe(false);
    expect(scripts).toHaveLength(1);
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
    const commands = browser.dataLayer as IArguments[];
    expect(commands.every((command) => Object.prototype.toString.call(command) === "[object Arguments]")).toBe(true);
    expect(commands.map((command) => Array.from(command).slice(0, 2))).toEqual([
      ["consent", "default"], ["set", "ads_data_redaction"],
      ["consent", "update"], ["js", expect.any(Date)],
      ["config", "AW-123456"], ["event", "conversion"],
    ]);
    expect(Array.from(commands[0] ?? [])[2]).toEqual({
      ad_storage: "denied", analytics_storage: "denied",
      ad_user_data: "denied", ad_personalization: "denied",
    });
    expect(Array.from(commands[1] ?? [])).toEqual(["set", "ads_data_redaction", true]);
    expect(Array.from(commands[2] ?? [])[2]).toEqual({
      ad_storage: "granted", analytics_storage: "denied",
      ad_user_data: "denied", ad_personalization: "denied",
    });
    expect(Array.from(commands.at(-1) ?? [])).toEqual([
      "event", "conversion", { send_to: "AW-123456/Label_ABC" },
    ]);
    // Fake array commands were previously accepted by unit tests but not by gtag.js.
    expect(Array.isArray(commands.at(-1))).toBe(false);
    expect(JSON.stringify(browser.dataLayer)).not.toContain("Testmake");
    expect(ADS_CONSENT_STORAGE_KEY).toBe("am-motors:ads-consent:v1");
  });
});
