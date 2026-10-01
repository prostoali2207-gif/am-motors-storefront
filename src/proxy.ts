import { NextResponse, type NextRequest } from "next/server";

import { contentSecurityPolicy, createNonce } from "@/lib/security-headers";

/**
 * Per-request Content-Security-Policy with a fresh nonce (Next.js 16 CSP guide, "Adding a nonce
 * with Proxy"). The policy goes on the request — Next.js extracts the nonce from it while rendering
 * and attaches it to its scripts — and on the response, where the browser enforces it.
 * Static security headers for every path are set in next.config.ts.
 */
export function proxy(request: NextRequest) {
  const csp = contentSecurityPolicy({
    nonce: createNonce(),
    development: process.env.NODE_ENV === "development",
  });

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
