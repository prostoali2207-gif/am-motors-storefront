import type { NextConfig } from "next";

import { MEDIA_CACHE_SECONDS } from "./src/lib/media-cache-policy";
import { STATIC_SECURITY_HEADERS } from "./src/lib/security-headers";

const nextConfig: NextConfig = {
  // No framework fingerprint header.
  poweredByHeader: false,
  // Same security headers on every response; the nonce CSP for pages is set in src/proxy.ts.
  async headers() {
    return [{ source: "/:path*", headers: [...STATIC_SECURITY_HEADERS] }];
  },
  images: {
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
