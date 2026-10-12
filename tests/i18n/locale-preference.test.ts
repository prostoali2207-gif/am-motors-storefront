import { describe, expect, it } from "vitest";

import {
  isAutoLocalePath,
  languageSelectionHref,
  localeFromAcceptLanguage,
  LOCALE_PREFERENCE_COOKIE,
  LOCALE_SELECTION_PARAM,
  resolveVisitorLocale,
} from "@/i18n/locale-preference";

describe("browser language selection", () => {
  it.each([
    ["ru-RU,ru;q=0.9,en-US;q=0.8", "ru"],
    ["ar-AE,ar;q=0.9,en;q=0.8", "ar"],
    ["en-US,en;q=0.9,ru;q=0.8", "en"],
    ["fr-FR,fr;q=0.9,en;q=0.7", "en"],
    ["fr-FR,fr;q=0.9", "en"],
    ["AR-ae,ru;q=0.5", "ar"],
    ["ru;q=0,en;q=0.5", "en"],
    ["ru;q=0.4,ar;q=0.9", "ar"],
    ["ru;q=1.2,ar;q=0.5", "ar"],
    ["en;q=0.6,ar;q=0.6", "en"],
  ] as const)("resolves %s to %s", (header, expected) => {
    expect(localeFromAcceptLanguage(header)).toBe(expected);
  });

  it("defaults to English when no valid preference exists", () => {
    expect(localeFromAcceptLanguage(null)).toBe("en");
    expect(localeFromAcceptLanguage("")).toBe("en");
    expect(localeFromAcceptLanguage("ru;q=0,ar;q=0")).toBe("en");
  });

  it("remembers manual choice above the browser language", () => {
    expect(resolveVisitorLocale("en", "ar-AE,ar;q=0.9")).toBe("en");
    expect(resolveVisitorLocale("ru", "en-US,en;q=0.9")).toBe("ru");
    expect(resolveVisitorLocale("ar", "ru-RU,ru;q=0.9")).toBe("ar");
    expect(resolveVisitorLocale("fr", "ru-RU,ru;q=0.9")).toBe("ru");
    expect(resolveVisitorLocale(undefined, "ar-AE")).toBe("ar");
    expect(LOCALE_PREFERENCE_COOKIE).toBe("am_site_locale");
  });

  it("limits auto redirects to the three real unprefixed public page shapes", () => {
    for (const path of ["/", "/cars", "/cars/TEST-0001", "/cars/AM%201%2F2"]) {
      expect(isAutoLocalePath(path)).toBe(true);
    }
    for (const path of ["/ar", "/ru/cars", "/ar/cars/TEST-0001", "/favicon.ico", "/robots.txt", "/sitemap.xml", "/media/test", "/api/health", "/cars/TEST-0001/more", "/cars/"]) {
      expect(isAutoLocalePath(path)).toBe(false);
    }
  });

  it("keeps the current vehicle ID when manually selecting any language", () => {
    expect(languageSelectionHref("/cars/TEST-0001", "ar")).toBe("/ar/cars/TEST-0001?__am_lang=ar");
    expect(languageSelectionHref("/ar/cars/AM%201%2F2", "ru")).toBe("/ru/cars/AM%201%2F2?__am_lang=ru");
    expect(languageSelectionHref("/ru/cars/TEST-0001", "en")).toBe("/cars/TEST-0001?__am_lang=en");
    expect(languageSelectionHref("/ru", "en")).toBe("/?__am_lang=en");
    expect(LOCALE_SELECTION_PARAM).toBe("__am_lang");
  });
});
