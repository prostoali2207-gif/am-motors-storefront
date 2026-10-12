import { NextResponse, type NextRequest } from "next/server";

import {
  isAutoLocalePath,
  LOCALE_PREFERENCE_COOKIE,
  LOCALE_PREFERENCE_MAX_AGE,
  LOCALE_SELECTION_PARAM,
  resolveVisitorLocale,
} from "@/i18n/locale-preference";
import { isLocale, switchLocalePath } from "@/i18n/locales";
import { contentSecurityPolicy, createNonce } from "@/lib/security-headers";
import { googleAdsConfig } from "@/lib/google-ads-config";

/**
 * Language negotiation is limited to public, unprefixed English routes.
 * Explicit /ar and /ru URLs always win. The browser header is used only
 * when no manual choice has been stored. No auto preference cookie is set.
 *
 * Preserve the existing per-request nonce CSP on rendered pages.
 */
export function proxy(request: NextRequest) {
  const csp = contentSecurityPolicy({
    nonce: createNonce(),
    development: process.env.NODE_ENV === "development",
    googleAdsEnabled: googleAdsConfig() !== null,
  });

  const { pathname } = request.nextUrl;
  const isPageRequest = request.method === "GET" || request.method === "HEAD";

  if (isPageRequest) {
    const choice = request.nextUrl.searchParams.get(LOCALE_SELECTION_PARAM);
    // The switcher uses an explicit link marker, so selection also works without JS.
    if (isLocale(choice)) {
      const target = request.nextUrl.clone();
      target.searchParams.delete(LOCALE_SELECTION_PARAM);
      target.pathname = switchLocalePath(pathname, choice);

      const response = NextResponse.redirect(target, 307);
      response.cookies.set(LOCALE_PREFERENCE_COOKIE, choice, {
        path: "/",
        maxAge: LOCALE_PREFERENCE_MAX_AGE,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      });
      response.headers.set("Content-Security-Policy", csp);
      response.headers.set("Cache-Control", "private, no-store");
      return response;
    }

    // Keep existing inbound ad URLs, query parameters, and vehicle IDs unchanged,
    // except for the localized path prefix chosen for this particular visitor.
    if (isAutoLocalePath(pathname)) {
      const locale = resolveVisitorLocale(
        request.cookies.get(LOCALE_PREFERENCE_COOKIE)?.value,
        request.headers.get("accept-language"),
      );
      if (locale !== "en") {
        const target = request.nextUrl.clone();
        target.pathname = switchLocalePath(pathname, locale);

        const response = NextResponse.redirect(target, 307);
        response.headers.set("Content-Security-Policy", csp);
        response.headers.set("Cache-Control", "private, no-store");
        response.headers.set("Vary", "Accept-Language, Cookie");
        return response;
      }
    }
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    {
      // Pages only: not build assets, optimized images or the /media image route (no HTML there).
      source: "/((?!_next/static|_next/image|media/).*)",
      // Router prefetches carry no HTML document to protect.
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
