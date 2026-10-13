import type { NextConfig } from "next";

import { MEDIA_CACHE_SECONDS } from "./src/lib/media-cache-policy";
import { STATIC_SECURITY_HEADERS } from "./src/lib/security-headers";

const nextConfig: NextConfig = {
  // No framework fingerprint header.
  poweredByHeader: false,
  // Same security headers on every response; the nonce CSP for pages is set in src/proxy.ts.
  async headers() {
    const standard = [{ source: "/:path*", headers: [...STATIC_SECURITY_HEADERS] }];
    // Google Tag Assistant launches an instrumented window with ?gtm_debug=...
    // COOP same-origin severs its window.opener channel and can stop the live
    // event stream even when the tag is initially detected. Preview already
    // supports this debug-only exception; keep that behavior on Production too.
    // Ordinary browsing on every environment keeps COOP same-origin. CSP,
    // X-Frame-Options and the other security headers remain unchanged.
    return [
      ...standard,
      {
        source: "/:path*",
        has: [{ type: "query" as const, key: "gtm_debug" }],
        headers: [{ key: "Cross-Origin-Opener-Policy", value: "unsafe-none" }],
      },
    ];
  },
  images: {
    // Vercel's /_next/image optimizer failed intermittently with MODULE_NOT_FOUND.
    // A bounded, first-party custom loader emits native srcset for /media?w=<width>
    // and the media route sanitizes each responsive variant. This avoids the broken
    // optimizer without shipping the original 2048px JPEG to every mobile viewport.
    loader: "custom",
    loaderFile: "./src/lib/media-image-loader.ts",
    deviceSizes: [480, 640, 768, 960, 1200, 1600],
    imageSizes: [80, 160, 320],
    // Vehicle images are served only by the site's own media route (sanitized, same-origin).
    // No remote hosts: raw Drive URLs are never image sources. Exact empty query only.
    localPatterns: [{ pathname: "/media/**", search: "" }],
    remotePatterns: [],
    // Must match the /media route lifetime (see src/lib/media-cache-policy.ts); the Next 16
    // default of 4 hours would keep optimized photos far longer than the ~1 h V1 bound.
    minimumCacheTTL: MEDIA_CACHE_SECONDS,
  },
};

export default nextConfig;
