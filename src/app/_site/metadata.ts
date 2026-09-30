import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";

import { LOCALE_CONFIG, LOCALES, localizedPath, type Locale, type SiteRoute } from "@/i18n/locales";
import { siteOrigin } from "@/lib/site-origin";

/** Metadata shared by every page of one language (set in its root layout). */
export function layoutMetadata(): Metadata {
  return {
    title: { default: "AM Motors", template: "%s · AM Motors" },
    // No brand assets are confirmed yet; an empty icon stops the browser's /favicon.ico 404.
    icons: { icon: "data:," },
  };
}

export const siteViewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Lets the mobile sticky action bar sit above the home indicator via env(safe-area-inset-*).
  viewportFit: "cover",
  themeColor: "#f6f5f1",
};

/**
 * Self-referencing canonical plus hreflang alternates for a page that exists in every language
 * (x-default → English, the original URLs). Absolute URLs use the origin the visitor actually
 * used — no domain is configured yet (open question 15); when the origin is unknown the links are
 * left out rather than guessed. Indexing rules are unchanged: nothing here sets `robots`.
 */
export async function alternates(locale: Locale, route: SiteRoute): Promise<Metadata["alternates"]> {
  const origin = siteOrigin(await headers());
  if (origin === null) return undefined;
  const languages: Record<string, string> = {};
  for (const target of LOCALES) languages[LOCALE_CONFIG[target].lang] = `${origin}${localizedPath(target, route)}`;
  languages["x-default"] = `${origin}${localizedPath("en", route)}`;
  return { canonical: `${origin}${localizedPath(locale, route)}`, languages };
}
