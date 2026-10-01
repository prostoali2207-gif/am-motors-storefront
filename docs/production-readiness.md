# Production readiness (Phase 9)

Status on 2026-10-01. **Production is not deployed and must not be until the user explicitly
approves the launch.** Production builds stay skipped (`vercel.json` + Vercel "Ignored Build
Step"); no Production env vars and no domain are configured. Update this file when an item changes.

## READY — verified

Security
- Headers on every response (pages, `/media`, `/_next/*`): `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (camera, microphone,
  geolocation, payment, USB, serial, Bluetooth, HID, MIDI, motion sensors, display capture,
  Topics all denied), `X-Frame-Options: DENY`, `Cross-Origin-Opener-Policy: same-origin`; no
  `X-Powered-By`. Source: `src/lib/security-headers.ts`, applied in `next.config.ts`.
- Enforced Content-Security-Policy on every page with a fresh per-request nonce
  (`src/proxy.ts`): `default-src 'self'`; `script-src 'self' 'nonce-…' 'strict-dynamic'` (no
  `unsafe-inline`, no `unsafe-eval` outside `next dev`); `style-src 'self' 'unsafe-inline'`;
  `img-src 'self' data:`; `font-src`/`connect-src 'self'`; `object-src`, `frame-src`,
  `media-src`, `base-uri`, `form-action`, `frame-ancestors` all `'none'`;
  `upgrade-insecure-requests`. No third-party host is allowed anywhere. All pages were already
  dynamically rendered, so the nonce costs no caching.
- Verified locally on a production build (real adapters, synthetic Sheet/Drive harness, Chromium):
  every script carries the nonce; 0 CSP violations and 0 console errors on `/`, `/cars`, VDP with
  photos, VDP without photos, sold VDP, unknown vehicle, unknown path, non-public status — in EN,
  AR, RU at 320, 390 and 1440 px; `next/image` covers and galleries, local fonts, sticky bar,
  language switcher and WhatsApp links all work under the policy.
- Leak scan of the build output and rendered HTML/RSC: no private Sheet columns or markers, no
  Drive URLs / file or folder IDs, no credentials or env var names, no `NEXT_PUBLIC_`, no fixtures.

Data and media (read-only check of the live Sheet and Drive, 2026-10-01)
- Live header matches the 26-column snapshot; only `В наличии` and `Продана` occur.
- 22 rows: 19 `В наличии`, 3 `Продана`. Status mapping is unchanged and fail closed (unit- and
  browser-tested: sold never in listings, no viewing/test-drive/WhatsApp actions on sold VDPs,
  any other status → 404).
- 2 of the 19 available cars have an empty price: the site omits the price (no
  "price on request" wording; open question 2 still open).
- Media come only from each vehicle's `Website/` folder: 6 available cars have one approved
  `01.jpg` (cover), 14 `Website/` folders are empty, 2 sold cars have none. Root-folder files are
  never listed (tested; a planted root image never appears in output). Cover order is
  deterministic (natural file name → upload time → file ID).

SEO and routing
- Self-referencing canonical + `hreflang` en / ar / ru / `x-default` on home, `/cars` and VDPs,
  built from the visitor's origin (no domain hard-coded).
- Unknown vehicle, non-public status and unknown paths return a real 404 with `noindex`, per
  language. Previews carry Vercel's `X-Robots-Tag: noindex` and Vercel Authentication.

Quality
- `npm run verify` green. axe: 0 serious/critical. Lighthouse (mobile, local harness — not real
  data or network): Performance 86–98, Accessibility 100, Best Practices 100, SEO 92 (no meta
  description), CLS ≤ 0.054.
- Cache policies reviewed, unchanged: inventory 60 s / 120 s hard max; Drive folder listing
  5 min; a removed photo can stay cached ≈ 1 h (`src/lib/media-cache-policy.ts`).
- The user checked the real Preview visually on Android Chrome.

## BLOCKERS — need a user/business decision or a physical device

1. **Final production domain** (open question 15). Needed for: the Vercel domain setup; making the
   custom domain the only host that serves pages (redirect the production `*.vercel.app` alias to
   it, otherwise canonical URLs self-reference two hosts); confirming HSTS on that domain (Vercel
   sends it on `*.vercel.app`; `includeSubDomains`/`preload` must not be added before the domain
   owner agrees); a sitemap, if wanted (needs absolute URLs).
2. **Sold VDP indexing** (open question 9): sold VDPs are currently indexable, like available
   ones. Decide `index` vs `noindex` and how long they stay online.
3. **Native-speaker review** of Arabic and Russian interface copy and WhatsApp templates (open
   question 19).
4. **Real iOS Safari check** on the Preview (not available in this environment; Android Chrome
   was checked by the user).
5. **Real-data Preview pass after this PR** (Vercel Authentication): the Phase 9 headers/CSP were
   verified locally only; confirm on the PR's Preview that pages render, covers load and the
   browser console shows no CSP errors (expected exception: the Vercel preview toolbar script,
   which is intentionally not allowed).
6. **Website photo review** (open question 12 c): name the reviewer; one approved cover's plate
   blur leaves the lower edge of the characters visible and one shows part of a background car's
   plate — re-check or re-blur before launch.
7. **Production switches at launch, by the user only**: Production env vars (inventory and, if
   wanted, `MEDIA_SOURCE`), removing the production guard, domain. Not done in Phase 9.

## Not blocking launch (decide later)

- Empty-price wording (open question 2): today an empty price is simply not shown.
- Meta descriptions (Lighthouse SEO 92): need approved copy built from public fields only.
- Brand assets (open question 14): the text wordmark and neutral tokens are an accepted visual
  direction; logo/favicon can follow.
- `/robots.txt` (absent → crawlers allowed everywhere public; 404 pages are `noindex`).
- Analytics/pixels, finance, filters, video, CRM, on-demand revalidation, photo purge tooling.

## Known limitations

- `style-src` keeps `'unsafe-inline'`: React and `next/image` write `style` attributes, which a
  nonce cannot cover. Styles cannot execute script; scripts remain nonce-only.
- Browsers without CSP nonce support (pre-2017) block the app scripts; pages still render from
  the server and every link, including WhatsApp, works without JavaScript.
- The static fallback `/_not-found` page carries no nonce (never reached in normal routing: every
  path falls into a language catch-all that renders a dynamic 404).
- Status-change propagation was not tested with a genuine Sheet change (not faked for testing).
