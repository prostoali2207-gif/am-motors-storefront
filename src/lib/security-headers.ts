/**
 * HTTP security headers (Phase 9). Two parts:
 *
 * - `STATIC_SECURITY_HEADERS` — the same on every response (pages, `/media`, `/_next/*`), set in
 *   `next.config.ts` `headers()`.
 * - `contentSecurityPolicy()` — per-request, with a fresh nonce, set by `src/proxy.ts` on page
 *   requests. Next.js reads the nonce from the request's CSP header and attaches it to its own
 *   scripts; every page is already dynamically rendered (request headers are read for canonical
 *   URLs and WhatsApp links), so the nonce costs no static optimization.
 *
 * Every allowed source is first-party: pages, fonts, styles and scripts come from the site's
 * origin and vehicle photos only from its own `/media` route through `/_next/image`. WhatsApp
 * actions are plain links (navigation is not governed by CSP). No analytics or third-party hosts.
 * Preview deployments get exactly the production policy, so a Preview tests what launches; the
 * Vercel preview toolbar script is therefore not allowed (it is not part of the site).
 */

export const STATIC_SECURITY_HEADERS: readonly { readonly key: string; readonly value: string }[] = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Full URL on same-origin requests; only the origin to other sites (e.g. WhatsApp), never on downgrade.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // The storefront uses none of these browser features; deny them to the page and any frame.
  {
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), bluetooth=(), hid=(), " +
      "midi=(), magnetometer=(), gyroscope=(), accelerometer=(), display-capture=(), browsing-topics=()",
  },
  // Legacy twin of CSP `frame-ancestors 'none'` for browsers that ignore CSP framing rules.
  { key: "X-Frame-Options", value: "DENY" },
  // Outbound WhatsApp tabs never get a handle back to this page (links are also rel="noopener").
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

export interface CspOptions {
  /** Base64 nonce, unique per request. */
  readonly nonce: string;
  /** `next dev` only: React needs `eval` for dev error overlays. Never in a build. */
  readonly development: boolean;
}

export function contentSecurityPolicy({ nonce, development }: CspOptions): string {
  const directives: [string, ...string[]][] = [
    ["default-src", "'self'"],
    // Only scripts carrying this request's nonce, plus the chunks they load ('strict-dynamic').
    // 'self' is a fallback for browsers without 'strict-dynamic' support; no 'unsafe-inline'.
    ["script-src", "'self'", `'nonce-${nonce}'`, "'strict-dynamic'", ...(development ? ["'unsafe-eval'"] : [])],
    // Known limitation: React and next/image write `style` attributes, which a nonce cannot
    // cover (and a nonce would disable 'unsafe-inline' for them). Styles cannot run code.
    ["style-src", "'self'", "'unsafe-inline'"],
    // Same-origin images (`/_next/image` of `/media/...`) and the empty `data:,` favicon.
    ["img-src", "'self'", "data:"],
    ["font-src", "'self'"],
    ["connect-src", "'self'"],
    ["media-src", "'none'"],
    ["object-src", "'none'"],
    ["frame-src", "'none'"],
    ["worker-src", "'self'"],
    ["manifest-src", "'self'"],
    ["base-uri", "'none'"],
    // The site has no forms; nothing may be posted anywhere.
    ["form-action", "'none'"],
    ["frame-ancestors", "'none'"],
  ];
  if (!development) directives.push(["upgrade-insecure-requests"]);
  return directives.map((parts) => parts.join(" ")).join("; ");
}

/** 128 random bits, base64 — the value placed in `'nonce-…'`. */
export function createNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}
