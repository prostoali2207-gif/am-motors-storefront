import { DEFAULT_LOCALE, isLocale, switchLocalePath, type Locale } from "@/i18n/locales";

/** Functional preference only: written when a visitor explicitly selects a language. */
export const LOCALE_PREFERENCE_COOKIE = "am_site_locale";
export const LOCALE_SELECTION_PARAM = "__am_lang";
export const LOCALE_PREFERENCE_MAX_AGE = 60 * 60 * 24 * 365;

/** Only the public English pages need first-visit language negotiation. */
export function isAutoLocalePath(pathname: string): boolean {
  return pathname === "/" || pathname === "/cars" || /^\/cars\/[^/]+$/.test(pathname);
}

/**
 * Respect the browser's weighted Accept-Language order, including region codes
 * (ar-AE, ru-RU, en-US). Unsupported or invalid language tags are ignored.
 * Ties use the browser's original order; no supported match means English.
 */
export function localeFromAcceptLanguage(header: string | null): Locale {
  if (!header) return DEFAULT_LOCALE;

  let bestLocale: Locale = DEFAULT_LOCALE;
  let bestWeight = -1;

  for (const part of header.split(",")) {
    const [languageTag, ...parameters] = part.trim().split(";");
    const language = languageTag?.trim().split("-")[0]?.toLowerCase();
    if (!isLocale(language)) continue;

    let weight = 1;
    const quality = parameters.map((parameter) => parameter.trim()).find((parameter) => /^q=/i.test(parameter));
    if (quality !== undefined) {
      const raw = quality.slice(2).trim();
      if (!/^(?:0(?:\.\d{1,3})?|1(?:\.0{1,3})?)$/.test(raw)) continue;
      weight = Number(raw);
    }
    if (weight > 0 && weight > bestWeight) {
      bestWeight = weight;
      bestLocale = language;
    }
  }

  return bestLocale;
}

/** Manual preference overrides the browser; an invalid cookie is ignored. */
export function resolveVisitorLocale(cookieValue: string | undefined, acceptLanguage: string | null): Locale {
  return isLocale(cookieValue) ? cookieValue : localeFromAcceptLanguage(acceptLanguage);
}

/**
 * Keep links crawlable and functional without JavaScript. The proxy removes this
 * one-time query marker, sets the preference cookie and sends a 307 to the clean
 * localized URL. The page and vehicle ID are preserved.
 */
export function languageSelectionHref(pathname: string, target: Locale): string {
  return `${switchLocalePath(pathname, target)}?${LOCALE_SELECTION_PARAM}=${target}`;
}
