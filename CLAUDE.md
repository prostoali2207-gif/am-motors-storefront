# AM Motors Storefront

Inventory-first dealership storefront for a UAE car dealer: storefront + small car catalog +
one detail page (VDP) per vehicle. Not a marketplace (not a Dubizzle clone), not a corporate
landing page, not an e-commerce checkout (no cart, no online payment).

Core funnel: ad/traffic → `/cars` or a specific `/cars/[id]` → VDP → WhatsApp / request a
viewing / request a test drive → inquiry (lead candidate) → Sales / Lead Conversion
qualification → qualified lead → appointment / viewing / test drive → sale. Second inquiry path
for cars not in stock: "Didn't find what you need?" → WhatsApp.

The storefront produces **inquiries**, never qualified leads. Qualification criteria belong to
Sales / Lead Conversion (auto-sales-growth-system); do not define or implement them here.

Full context: `docs/product-brief.md`, `docs/business-rules.md`, `docs/ux-benchmark.md`,
`docs/implementation-plan.md`.

## Current status

- Phase 1 (Foundation) implemented: routes, public `Vehicle` type, `InventoryRepository`, and a
  production default adapter that returns `unavailable` when no source is configured.
- Phase 2 (Google Sheets adapter) implemented in `src/adapters/google-sheets`, enabled by
  server env (`INVENTORY_SOURCE=google-sheets`, see `.env.example` and
  `docs/google-sheets-setup.md`). Live read verified on Vercel Preview (Phase 6).
- Phase 3 (Drive media pipeline) implemented in `src/adapters/google-drive-media` and the
  route `src/app/media/…`, enabled only by `MEDIA_SOURCE=google-drive` (off by default; VDPs
  show "Photos unavailable"). Publishing rule: Phase 8 below. VDPs (`getById`) carry all approved images; listing reads carry
  only each car's cover (`01.*`) for the card (text-only card when none). Photo cache
  policy (~1 h worst case): `src/lib/media-cache-policy.ts`.
- Phase 4A (live visual benchmark, accepted) and Phase 4 (storefront UX, "Coachwork" direction)
  recorded in `docs/ux-benchmark.md`. Phase 4 **accepted and merged** (PR #5): neutral tokens
  (no accent until brand assets), Geologica self-hosted with Cyrillic (`src/app/fonts/`),
  inventory-first home and `/cars`, typographic cards (cover photo added in Phase 8 follow-up), VDP no-photo state, sold VDP styling. No
  sorting (source order), media ratio provisional (`--media-ratio`).
- Phase 5 (Conversion & attribution) **accepted and merged** (PR #6): available VDPs get
  WhatsApp (primary) + "Request a viewing" / "Request a test drive" (secondary), all opening
  WhatsApp +971 50 343 2337 with confirmed prefills (`src/conversion/`); mobile sticky bar
  (WhatsApp + test drive) after the in-page actions scroll away; sold VDPs have no actions;
  "Didn't find what you need?" general request on `/` and `/cars`. First-touch UTM parameters
  (no click IDs) in `sessionStorage`, appended to prefills (`src/attribution/`). No pixels,
  analytics, cookies, forms, API or CRM (open question 15). Confirmed decisions:
  `docs/business-rules.md` → "Contact and inquiries".
- Phase 6 (Vercel preview + real data verification) **complete, PR #7 merged**: Vercel project
  `am-motors-storefront` (Hobby account scope), Vercel Authentication on all previews,
  production builds skipped (project "Ignored Build Step" + `vercel.json`
  `git.deploymentEnabled.main = false`). Preview-only env vars; `MEDIA_SOURCE` unset.
  Google Workload Identity Federation set up by the user in Google Cloud (2026-09-30; pool and
  provider IDs `vercel` per `docs/google-sheets-setup.md`); all seven Preview-only env vars set,
  Preview redeployed. Live read verified on preview `689a914` (2026-09-30): OIDC works, 20
  public vehicles (18 available on `/` and `/cars`, 2 sold as direct-only VDPs AM-002 / AM-004
  with no actions), no adapter issues; browser checks (routes, prefills, UTM first-touch,
  sticky bar, 320/390/1440, axe, keyboard, console, leak scan) passed. Truthful `unavailable`
  state verified on an earlier Preview without Google auth (no fixture fallback). Human visual
  review accepted the current visual direction for this phase. Sheet link sharing is
  Restricted (owner, named staff, service account as Viewer). Not run: real iOS Safari and
  Android Chrome devices; live cache propagation after a genuine Sheet status change.
- Phase 7 (multilingual) **accepted and merged** (PR #8): English (default, original unprefixed
  URLs), Arabic (RTL, `/ar…`), Russian (`/ru…`); no browser-language redirect; header switcher
  EN · العربية · RU keeps the same page / vehicle ID. Per-language root layouts `src/app/(en)`,
  `src/app/ar`, `src/app/ru` (one-line route files) share `src/app/_site` (route bodies,
  metadata, fonts) and `src/components/site-document.tsx`. Copy in `src/i18n/messages.ts`;
  approved categorical display values incl. current colours in `src/i18n/vehicle-values.ts`
  (unknown values shown verbatim; `AED` everywhere, `Ref:` in English in every language); WhatsApp prefills follow the page language (`src/conversion/`). Arabic companion
  font Noto Kufi Arabic (Arabic pages only). Decisions: `docs/business-rules.md` → "Languages —
  Phase 7"; benchmark: `docs/ux-benchmark.md` → "Phase 7".
- Phase 8 (website photo publishing) **accepted and merged** (PR #9): media
  come only from the single `Website/` child folder of each vehicle folder (exact name; missing /
  duplicate / empty → "Photos unavailable"; the vehicle root is never listed); JPEG/PNG/WebP
  only; `01.*` = cover; videos off. Rule: `docs/business-rules.md` → "Website photos". Drive API
  enabled and `AM Motors — Машины` shared with the service account (2026-10-01). Live keyless
  read verified on Vercel Preview `a7db21f` (2026-10-01) with a temporary preview-only read-only
  diagnostic (removed before review): `vercel-oidc` works, Drive API works, all 20 vehicle
  folders accessible via the inherited folder share, every vehicle `no-website-folder` (no
  `Website/` folders exist yet), no `inaccessible`/`source-error`. Merged (PR #9). Since
  then staff created `Website/` folders for some vehicles and the user set
  `MEDIA_SOURCE=google-drive` in Preview only (Production untouched).
- Listing card covers (follow-up to Phase 8) **merged** (PR #10): `/` and `/cars` cards show the
  vehicle's first approved `Website/` image (`01.*`) above the eyebrow in the `--media-ratio`
  frame (`contain`, no crop, one image, no carousel); no approved image → text-only card, no
  box. Covers resolved in parallel (6 at a time) through the same 5-minute cached folder
  listing: cold cache ≤ 3 Drive metadata calls per linked vehicle, warm cache 0. Rule:
  `docs/business-rules.md` → "Website photos". Approved covers are live in Preview
  (`MEDIA_SOURCE=google-drive`, Preview only); Production untouched.
- Phase 9 (pre-production hardening; PR open, not merged): HTTP security headers on every
  response (`next.config.ts` `headers()` from `src/lib/security-headers.ts`) and a per-request
  nonce Content-Security-Policy with `'strict-dynamic'` on pages (`src/proxy.ts`); first-party
  sources only, Preview gets the production policy. Launch checklist (READY / BLOCKERS):
  `docs/production-readiness.md`. Production still forbidden and not configured.
- Work proceeds phase by phase per `docs/implementation-plan.md`. Do not start a phase
  unless the user explicitly asks for it.
- **Production deployment is forbidden** until the user explicitly approves it.
  Vercel previews are allowed only from Phase 6 on.

## Required skills

Invoke the matching project skill (`.claude/skills/`) before doing the work. When a task
spans several areas, use every matching skill.

| Task touches… | Skill |
| - | - |
| UX, IA, homepage, `/cars`, VDP layout, cards, filters/search, CTAs, mobile hierarchy, visual direction, copy tone | `designing-automotive-storefront` |
| Any vehicle data: price, status, mileage, specs, condition, photos, Google Sheet / Drive, public data model, customer-facing vehicle copy, SEO/meta/ads with vehicle facts | `protecting-commercial-truth` |
| Writing or changing application code: Next.js, TypeScript, routes, data adapters, images, caching, a11y, performance, config, tests | `building-nextjs-storefront` |
| Claiming a task is done, opening/updating a PR, or preparing any deployment | `verifying-storefront` |

`verifying-storefront` is mandatory before saying "done" on any change to code or content.

## Non-negotiable rules

Commercial truth
- The only authoritative source of vehicle data is the Google Sheet
  **"AM Motors — Справочник машин"**. The authoritative source of vehicle photos/video is the
  Google Drive folders linked to each vehicle.
- Never invent, estimate, or reuse from old content: price, availability/status, mileage,
  specs, condition, accident/service history, discounts, finance, warranty, trade-in,
  delivery, or any other commercial fact. Missing data is shown as missing, never guessed.
- Live inventory is never stored in code as the source of truth. Synthetic vehicle fixtures
  may exist **only inside test directories** and must be obviously fake.
- The public vehicle model is an explicit allowlist. Internal Sheet fields (cost, supplier,
  owner/seller contacts, VIN/chassis unless approved, notes, margins, etc.) are never
  published, serialized to the client, or logged in public output.
- Sheet schema snapshot and column classification: `docs/business-rules.md` and
  `.claude/skills/protecting-commercial-truth/field-policy.md`. Never derive fields that the
  Sheet does not have (body type, description, options…) from knowledge of the car model.
- Status: `В наличии` → available, `Продана` → sold. Anything else is not public (fail
  closed); Reserved is not confirmed. Sold cars never look Available; they may appear only in
  a clearly separate "Sold" / social-proof context.

Scope
- Do not add finance/monthly payments, trade-in, warranty, delivery, insurance,
  price-negotiation or similar features until the business confirms them in
  `docs/business-rules.md`.
- Small stock: no marketplace-grade search/filter system. Add filters/search only when real
  inventory size and UX evidence justify it.
- An ad for a specific car must land on that car's VDP, never on the generic homepage.

Product and design
- Mobile-first. The VDP is a primary conversion page.
- CTAs say "Request a viewing" / "Request a test drive" — never "Book" until a real scheduling
  system is confirmed.
- Homepage is inventory-first: cars visible quickly, no oversized decorative hero.
- No generic AI aesthetic: no SaaS hero templates, purple gradients, decorative
  glassmorphism, fake dashboards, generic black-and-gold "luxury". Material design
  decisions need benchmark evidence (see `docs/ux-benchmark.md`).

Security
- Google credentials and API keys stay server-side in environment variables. Never commit
  secrets, never expose them via `NEXT_PUBLIC_*`, never paste real Sheet rows into the repo,
  issues, PRs, or test fixtures.

## Conventions

- Language of code, docs and commits: English. The Sheet name stays verbatim (Russian).
- Stack: Next.js App Router + TypeScript (strict), Server Components by default. Versions are
  pinned exactly in `package.json`; upgrade deliberately, after reading the official docs.
- Open questions and unconfirmed business facts live in `docs/business-rules.md` →
  "Open questions". When a task depends on one, ask the user; do not assume.

## Stack and commands

Pinned versions (Node >= 20.9, npm): `next` 16.3.7, `react` / `react-dom` 19.2.8,
`typescript` 5.9.3, `eslint` 9.39.5 + `eslint-config-next` 16.3.7 (flat config),
`vitest` 5.0.2 + `@testing-library/react` 16.3.3 + `jsdom` 30.1.1, `server-only` 0.0.1,
`google-auth-library` 10.9.1 (v11 needs Node >= 22), `@vercel/oidc` 3.8.9, `sharp` 0.35.5
(same version Next.js itself installs for image optimization; used to strip image metadata).
React / TypeScript / ESLint majors follow the official `create-next-app@16.3.7` template.

| Command | What it does |
| - | - |
| `npm run dev` | Dev server (Turbopack) |
| `npm run lint` | ESLint CLI (`next lint` no longer exists in Next 16) |
| `npm run typecheck` | `next typegen` (route types for `PageProps`/`LayoutProps`) + `tsc --noEmit` |
| `npm run test` | Vitest, single run |
| `npm run build` | Production build (does not lint) |
| `npm run verify` | lint → typecheck → test → build |
| `npm run smoke:sheets` | Read-only live Sheet smoke test (needs `.env.local`; prints counts only; not in `verify`) |
| `npm run smoke:media` | Read-only live Drive media smoke test (per-vehicle state/counts only; not in `verify`) |

Layout: `src/domain` (public types, ID rules), `src/i18n` (locales, paths, interface copy,
categorical display values), `src/inventory` (repository interface, adapter
factory, request-time queries), `src/adapters` (data sources), `src/conversion` (WhatsApp
number, prefill templates), `src/attribution` (first-touch UTM parameters, browser session only),
`src/components` (sync views + small client islands), `src/app` (per-language route trees +
`_site` shared route bodies), `src/proxy.ts` (per-request CSP nonce), `src/lib` (env, origin,
cache and security-header policies). Tests and synthetic fixtures live only in `tests/`.
Vitest cannot render async Server Components: keep pages thin and test the sync views.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
