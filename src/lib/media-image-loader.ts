/**
 * First-party image loader: generate width-specific /media URLs directly, never use
 * Vercel's failing /_next/image optimizer. Only these finite variants can reach Sharp.
 * All inputs are authoritative Website/ media paths; no Google Drive URLs leave the server.
 */
export const MEDIA_RESPONSIVE_WIDTHS = [80, 160, 320, 480, 640, 768, 960, 1200, 1600] as const;
export type MediaResponsiveWidth = (typeof MEDIA_RESPONSIVE_WIDTHS)[number];

export function isResponsiveMediaWidth(value: number): value is MediaResponsiveWidth {
  return (MEDIA_RESPONSIVE_WIDTHS as readonly number[]).includes(value);
}

export default function mediaImageLoader({ src, width }: { src: string; width: number; quality?: number }): string {
  if (!/^\/media\/[^/?#]+\/[A-Za-z0-9_-]{22}\/[A-Za-z0-9_-]{12}$/.test(src)) {
    throw new Error("Only first-party /media image URLs are permitted");
  }
  if (!isResponsiveMediaWidth(width)) throw new Error("Unsupported responsive media width");
  return `${src}?w=${width}`;
}
