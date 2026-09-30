import { describe, expect, it } from "vitest";

import {
  DEFAULT_LOCALE,
  LOCALE_CONFIG,
  LOCALES,
  isLocale,
  localeFromPathname,
  localizedPath,
  switchLocalePath,
} from "@/i18n/locales";

describe("locales", () => {
  it("supports exactly English (default), Arabic and Russian", () => {
    expect(LOCALES).toEqual(["en", "ar", "ru"]);
    expect(DEFAULT_LOCALE).toBe("en");
    expect(isLocale("ar")).toBe(true);
    expect(isLocale("fr")).toBe(false);
  });

  it("sets lang and direction per language: only Arabic is RTL", () => {
    expect(LOCALE_CONFIG.en).toMatchObject({ lang: "en", dir: "ltr" });
    expect(LOCALE_CONFIG.ar).toMatchObject({ lang: "ar", dir: "rtl" });
    expect(LOCALE_CONFIG.ru).toMatchObject({ lang: "ru", dir: "ltr" });
  });

  it("labels the switcher EN · العربية · RU (no flags)", () => {
    expect(LOCALES.map((l) => LOCALE_CONFIG[l].switcherLabel)).toEqual(["EN", "العربية", "RU"]);
  });
});

describe("localizedPath", () => {
  it("keeps the original English URLs unprefixed", () => {
    expect(localizedPath("en", { kind: "home" })).toBe("/");
    expect(localizedPath("en", { kind: "cars" })).toBe("/cars");
    expect(localizedPath("en", { kind: "vehicle", id: "TEST-0001" })).toBe("/cars/TEST-0001");
  });

  it("prefixes Arabic and Russian", () => {
    expect(localizedPath("ar", { kind: "home" })).toBe("/ar");
    expect(localizedPath("ar", { kind: "cars" })).toBe("/ar/cars");
    expect(localizedPath("ar", { kind: "vehicle", id: "TEST-0001" })).toBe("/ar/cars/TEST-0001");
    expect(localizedPath("ru", { kind: "home" })).toBe("/ru");
    expect(localizedPath("ru", { kind: "cars" })).toBe("/ru/cars");
    expect(localizedPath("ru", { kind: "vehicle", id: "TEST-100000" })).toBe("/ru/cars/TEST-100000");
  });

  it("uses the vehicle ID verbatim, URL-encoded only", () => {
    expect(localizedPath("ar", { kind: "vehicle", id: "TEST 1/2" })).toBe("/ar/cars/TEST%201%2F2");
  });
});

describe("switchLocalePath", () => {
  const cases: Array<[string, string, string, string]> = [
    // path, → en, → ar, → ru
    ["/", "/", "/ar", "/ru"],
    ["/cars", "/cars", "/ar/cars", "/ru/cars"],
    ["/cars/TEST-0001", "/cars/TEST-0001", "/ar/cars/TEST-0001", "/ru/cars/TEST-0001"],
    ["/ar", "/", "/ar", "/ru"],
    ["/ar/cars", "/cars", "/ar/cars", "/ru/cars"],
    ["/ar/cars/TEST-0001", "/cars/TEST-0001", "/ar/cars/TEST-0001", "/ru/cars/TEST-0001"],
    ["/ru/cars/TEST-100000", "/cars/TEST-100000", "/ar/cars/TEST-100000", "/ru/cars/TEST-100000"],
  ];

  it.each(cases)("%s keeps the same page in every language", (path, en, ar, ru) => {
    expect(switchLocalePath(path, "en")).toBe(en);
    expect(switchLocalePath(path, "ar")).toBe(ar);
    expect(switchLocalePath(path, "ru")).toBe(ru);
  });

  it("preserves an encoded vehicle ID byte for byte", () => {
    expect(switchLocalePath("/cars/TEST%201%2F2", "ar")).toBe("/ar/cars/TEST%201%2F2");
    expect(switchLocalePath("/ru/cars/TEST%201%2F2", "en")).toBe("/cars/TEST%201%2F2");
  });

  it("does not mistake paths that merely start with the letters of a prefix", () => {
    expect(localeFromPathname("/arabic")).toBe("en");
    expect(switchLocalePath("/rules", "ar")).toBe("/ar/rules");
    expect(switchLocalePath("/arabic", "en")).toBe("/arabic");
  });

  it("detects the language of a path", () => {
    expect(localeFromPathname("/")).toBe("en");
    expect(localeFromPathname("/cars/TEST-0001")).toBe("en");
    expect(localeFromPathname("/ar")).toBe("ar");
    expect(localeFromPathname("/ru/cars")).toBe("ru");
  });
});
