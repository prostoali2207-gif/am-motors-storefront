# Production readiness (Phase 9 → launch)

Status on 2026-10-05 (launch PR). **Production is not deployed and must not be until the user
explicitly approves the launch.** The launch PR removes the repository production guard
(`vercel.json` `git.deploymentEnabled.main = false`); once it is merged, a push to `main` can
build Production unless the Vercel project's "Ignored Build Step" still skips it. Starting the
Production deployment (merging, changing the Ignored Build Step, promoting) is done by the user
only. Update this file when an item changes.

## Launch configuration (reported by the user, 2026-10-05)

- **Production env vars are set in Vercel** (Production scope, server-side, never
  `NEXT_PUBLIC_`), alongside the existing Preview-only ones.
- **Google Workload Identity provider** (pool/provider `vercel`) attribute condition now allows
  this Vercel project's `preview` **and** `production` environments (still only this owner and
  project ID).
- **`storefront-sheets-reader`** has a separate Workload Identity User principal per environment:
  the `…:environment:preview` subject and the `…:environment:production` subject
  (see `docs/google-sheets-setup.md` for the subject format). No JSON key.
- **Domain:** launch temporarily on `am-motors-storefront.vercel.app`; no purchased domain yet.
  Canonical/`hreflang` URLs are built from the visitor's origin, so nothing is hard-coded.
- **PR #12 (VDP photo gallery) is merged** into `main`.
- Repository production guard removed in this PR (`vercel.json` keeps only `$schema`). No
  application code changed.

Not verified from this environment: the Vercel and Google Cloud settings above (no access to
the dashboards here); a live Production read. Verify on the first Production deployment:
`/`, `/cars` and a VDP render real inventory, covers load, no CSP errors in the console.

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
- The two cover defects found in the Phase 9 content check (a partly readable plate on one cover,
  a background car's plate on another) were fixed in the authoritative Drive by the user
  (reported 2026-10-01: plates fully blurred, no characters readable).

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

1. **Final production domain** (open question 15) — **deferred, not blocking the temporary
   launch** on `am-motors-storefront.vercel.app`. When a domain is bought: Vercel domain setup;
   make the custom domain the only host that serves pages (redirect the `*.vercel.app` alias to
   it, otherwise canonical URLs self-reference two hosts); confirm HSTS on that domain
   (`includeSubDomains`/`preload` only with the domain owner's agreement); a sitemap, if wanted
   (needs absolute URLs).
2. **Sold VDP indexing** (open question 9): sold VDPs are currently indexable, like available
   ones. Decide `index` vs `noindex` and how long they stay online.
3. **Native-speaker review** of Arabic and Russian interface copy and WhatsApp templates (open
   question 19).
4. **Real iOS Safari check** on the Preview (not available in this environment; Android Chrome
   was checked by the user).
5. **Real-data Preview pass of the Phase 9 headers/CSP and the PR #12 gallery**: verified
   locally only in this environment; confirm on a Preview or the first Production deployment that
   pages render, covers and galleries load and the console shows no CSP errors (expected
   exception on Previews: the Vercel toolbar script, intentionally not allowed).
6. **Name the Website photo reviewer** (open question 12 c).
7. **Production switches at launch** — env vars and Google Workload Identity done by the user
   (above); repository guard removed by the launch PR. Remaining, **by the user only**: merge the
   launch PR, allow Production builds in the Vercel project ("Ignored Build Step"), start the
   Production deployment. Confirm whether `MEDIA_SOURCE=google-drive` is set in Production.

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
