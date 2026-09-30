/**
 * Customer-facing languages (Phase 7). English is the default and keeps the original,
 * unprefixed URLs (`/`, `/cars`, `/cars/<ID>`) so existing and ad links never break; Arabic and
 * Russian live under `/ar` and `/ru` with the same paths below the prefix.
 *
 * No automatic redirect by browser language: the visitor chooses with the language switcher.
 */
export const LOCALES = ["en", "ar", "ru"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

interface LocaleConfig {
  /** `<html lang>` and `hreflang` value. */
  readonly lang: string;
  readonly dir: "ltr" | "rtl";
  /** URL prefix; empty for the default locale. */
  readonly prefix: "" | `/${string}`;
  /** Language switcher label, written in the language itself. */
  readonly switcherLabel: string;
  /** Full language name in the language itself (accessible name of the switcher link). */
  readonly name: string;
}

export const LOCALE_CONFIG: Readonly<Record<Locale, LocaleConfig>> = {
  en: { lang: "en", dir: "ltr", prefix: "", switcherLabel: "EN", name: "English" },
  ar: { lang: "ar", dir: "rtl", prefix: "/ar", switcherLabel: "العربية", name: "العربية" },
  ru: { lang: "ru", dir: "ltr", prefix: "/ru", switcherLabel: "RU", name: "Русский" },
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** The pages that exist in every language. */
export type SiteRoute = { readonly kind: "home" } | { readonly kind: "cars" } | { readonly kind: "vehicle"; readonly id: string };

/** Path of a page in a language. The vehicle ID is used verbatim (URL-encoded only). */
export function localizedPath(locale: Locale, route: SiteRoute): string {
  const prefix = LOCALE_CONFIG[locale].prefix;
  switch (route.kind) {
    case "home":
      return prefix === "" ? "/" : prefix;
    case "cars":
      return `${prefix}/cars`;
    case "vehicle":
      return `${prefix}/cars/${encodeURIComponent(route.id)}`;
    default: {
      const unhandled: never = route;
      return unhandled;
    }
  }
}

/** The non-default locale whose prefix starts `pathname`, if any. */
function prefixedLocale(pathname: string): Locale | null {
  for (const locale of LOCALES) {
    const prefix = LOCALE_CONFIG[locale].prefix;
    if (prefix !== "" && (pathname === prefix || pathname.startsWith(`${prefix}/`))) return locale;
  }
  return null;
}

/** Language of a site path: `/ar…` → ar, `/ru…` → ru, anything else → en. */
export function localeFromPathname(pathname: string): Locale {
  return prefixedLocale(pathname) ?? DEFAULT_LOCALE;
}

/**
 * The same page in another language: swaps only the language prefix, keeping the rest of the
 * path (and therefore the vehicle ID) byte for byte. Query and hash are not carried over — the
 * first-touch UTM parameters already live in the tab session (src/attribution/).
 */
export function switchLocalePath(pathname: string, target: Locale): string {
  const current = prefixedLocale(pathname);
  const rest = current === null ? pathname : pathname.slice(LOCALE_CONFIG[current].prefix.length);
  const path = rest === "" ? "/" : rest.startsWith("/") ? rest : `/${rest}`;
  const prefix = LOCALE_CONFIG[target].prefix;
  if (prefix === "") return path;
  return path === "/" ? prefix : `${prefix}${path}`;
}
