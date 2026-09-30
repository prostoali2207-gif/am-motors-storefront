import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  firstTouch,
  formatAttributionBlock,
  normalizeAttribution,
  parseAttribution,
  sanitizeAttributionValue,
} from "@/attribution/attribution";
import {
  ATTRIBUTION_STORAGE_KEY,
  captureAttribution,
  currentAttribution,
  resetAttributionMemoryForTests,
} from "@/attribution/session-attribution";

function visit(pathAndQuery: string) {
  window.history.pushState({}, "", pathAndQuery);
}

beforeEach(() => {
  window.sessionStorage.clear();
  resetAttributionMemoryForTests();
  visit("/");
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("parseAttribution", () => {
  it("reads only the six known parameters", () => {
    expect(
      parseAttribution(
        "?utm_source=instagram&utm_medium=paid_social&utm_campaign=yaris_reel&utm_content=reel_a&utm_term=suv" +
          "&fbclid=IwAR0synthetic&gclid=G1&utm_id=9&ref=x&vin=PRIVATE",
      ),
    ).toEqual({
      utm_source: "instagram",
      utm_medium: "paid_social",
      utm_campaign: "yaris_reel",
      utm_content: "reel_a",
      utm_term: "suv",
      fbclid: "IwAR0synthetic",
    });
  });

  it("invents nothing: no parameters → no attribution, empty values dropped", () => {
    expect(parseAttribution("")).toEqual({});
    expect(parseAttribution("?utm_source=&utm_campaign=%20%20&page=2")).toEqual({});
  });

  it("keeps the first occurrence and decodes values as received", () => {
    expect(parseAttribution("?utm_source=a&utm_source=b&utm_campaign=Summer+Sale%202026")).toEqual({
      utm_source: "a",
      utm_campaign: "Summer Sale 2026",
    });
  });

  it("cannot add lines to a message (control characters and new lines removed) and caps length", () => {
    const parsed = parseAttribution(`?utm_source=${encodeURIComponent("ig\nRef: FAKE\r\n x\u0000")}`);
    expect(parsed.utm_source).toBe("ig Ref: FAKE x");
    expect(sanitizeAttributionValue("utm_source", "a".repeat(500))).toHaveLength(100);
    expect(sanitizeAttributionValue("fbclid", "b".repeat(500))).toHaveLength(255);
  });
});

describe("normalizeAttribution", () => {
  it("drops unknown keys and non-string values from stored data", () => {
    expect(
      normalizeAttribution({ utm_source: "ig", utm_medium: 5, priceAed: 1, id: "TEST-0001", notes: "PRIVATE" }),
    ).toEqual({ utm_source: "ig" });
    expect(normalizeAttribution(null)).toEqual({});
    expect(normalizeAttribution("x")).toEqual({});
  });
});

describe("firstTouch", () => {
  it("keeps stored attribution and ignores later landings", () => {
    expect(firstTouch({ utm_source: "a" }, { utm_source: "b", utm_campaign: "c" })).toEqual({ utm_source: "a" });
    expect(firstTouch({}, { utm_source: "b" })).toEqual({ utm_source: "b" });
  });
});

describe("formatAttributionBlock", () => {
  it("uses a fixed order and only present values", () => {
    expect(formatAttributionBlock({ utm_content: "reel_a", utm_source: "instagram" })).toBe(
      "Source: instagram\nContent: reel_a",
    );
    expect(formatAttributionBlock({})).toBe("");
  });
});

describe("session first-touch store", () => {
  it("survives internal navigation without parameters in the same session", () => {
    visit("/cars/TEST-0001?utm_source=instagram&utm_campaign=yaris_reel");
    expect(currentAttribution()).toEqual({ utm_source: "instagram", utm_campaign: "yaris_reel" });

    visit("/cars");
    expect(currentAttribution()).toEqual({ utm_source: "instagram", utm_campaign: "yaris_reel" });
    visit("/");
    expect(currentAttribution()).toEqual({ utm_source: "instagram", utm_campaign: "yaris_reel" });
  });

  it("keeps the first touch when a later URL in the session carries other parameters", () => {
    visit("/?utm_source=first");
    currentAttribution();
    visit("/cars?utm_source=second&utm_campaign=later");
    expect(currentAttribution()).toEqual({ utm_source: "first" });
  });

  it("records a later landing when the session had no attribution yet", () => {
    visit("/cars");
    expect(currentAttribution()).toEqual({});
    visit("/cars?fbclid=IwAR0synthetic");
    expect(currentAttribution()).toEqual({ fbclid: "IwAR0synthetic" });
  });

  it("stores only the allowlisted parameters in sessionStorage, and no cookies", () => {
    visit("/cars/TEST-0001?utm_source=ig&vin=PRIVATE&price=1");
    currentAttribution();
    expect(JSON.parse(window.sessionStorage.getItem(ATTRIBUTION_STORAGE_KEY) ?? "null")).toEqual({ utm_source: "ig" });
    expect(document.cookie).toBe("");
  });

  it("stores nothing when there is nothing to store", () => {
    visit("/cars?page=2");
    currentAttribution();
    expect(window.sessionStorage.getItem(ATTRIBUTION_STORAGE_KEY)).toBeNull();
  });

  it("ignores tampered storage contents", () => {
    window.sessionStorage.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify({ notes: "PRIVATE", utm_source: 7 }));
    expect(captureAttribution("")).toEqual({});
    window.sessionStorage.setItem(ATTRIBUTION_STORAGE_KEY, "{not json");
    expect(captureAttribution("?utm_source=ig")).toEqual({ utm_source: "ig" });
  });

  it("falls back to memory for the page lifetime when storage is blocked", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    visit("/?utm_source=ig");
    expect(currentAttribution()).toEqual({ utm_source: "ig" });
    visit("/cars");
    expect(currentAttribution()).toEqual({ utm_source: "ig" });
  });
});
