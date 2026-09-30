/**
 * V1 photo cache policy — conservative, no purge/invalidation tooling.
 *
 * Goal: a photo removed from its Drive folder (or a wrongly published one) stops being served
 * within about ONE HOUR, not days. Three cache layers can each hold a copy of the same URL:
 *
 *   1. `/media/…` response (browser + CDN): `max-age` / `s-maxage` = MEDIA_CACHE_SECONDS.
 *   2. `/_next/image` optimized variants: Next.js 16 caches them for
 *      max(images.minimumCacheTTL, upstream `s-maxage` || `max-age`) and sends that value to
 *      browsers as `max-age`. `minimumCacheTTL` is therefore set to the same value — the
 *      Next 16 default (4 h) would otherwise dominate.
 *   3. The visitor's browser copy of the optimized variant (same max-age as layer 2).
 *
 * Worst case after removal: MEDIA_WORST_CASE_SECONDS (= 3 × 20 min = 60 min). Pages stop
 * referencing a removed photo sooner (media listing cache, ~5 min). The content-version URL
 * (`/media/<id>/<media>/<rev>`) is kept: a replaced photo gets a new URL immediately.
 *
 * Imported by `next.config.ts`, so this module must stay dependency-free and not server-only.
 */
export const MEDIA_CACHE_SECONDS = 20 * 60;

/** `/media/…` success header: browser and CDN hold the same bounded lifetime. */
export const MEDIA_CACHE_CONTROL = `public, max-age=${MEDIA_CACHE_SECONDS}, s-maxage=${MEDIA_CACHE_SECONDS}`;

/** Upper bound across the three layers above (route CDN copy → optimized copy → browser). */
export const MEDIA_WORST_CASE_SECONDS = 3 * MEDIA_CACHE_SECONDS;
