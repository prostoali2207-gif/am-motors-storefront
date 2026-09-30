import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Vehicle images are served only by the site's own media route (sanitized, same-origin).
    // No remote hosts: raw Google Drive URLs are never image sources. Exact empty query only.
    localPatterns: [{ pathname: "/media/**", search: "" }],
    remotePatterns: [],
  },
};

export default nextConfig;
