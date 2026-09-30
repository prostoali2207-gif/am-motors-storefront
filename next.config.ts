import type { NextConfig } from "next";

import { MEDIA_CACHE_SECONDS } from "./src/lib/media-cache-policy";

const nextConfig: NextConfig = {
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
