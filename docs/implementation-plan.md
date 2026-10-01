# Implementation plan

Each phase starts only when the user explicitly asks for it. Every phase ends with the
`verifying-storefront` skill and a PR for review. **Production deployment is forbidden** until the
user explicitly approves it.

## Phase 0 — Repository operating layer (current)

- `CLAUDE.md`, project skills in `.claude/skills/`, docs in `docs/`.
- No application code.

## Phase 1 — Foundation

Skills: `building-nextjs-storefront`, `protecting-commercial-truth`, `verifying-storefront`.

- Current stable Next.js App Router + TypeScript (strict); versions checked against official docs
  and pinned; package manager chosen and recorded in `CLAUDE.md`.
- Routes: `/`, `/cars`, `/cars/[id]` with minimal, unstyled-but-accessible markup.
- Public `Vehicle` domain type (allowlist) and `VehicleStatus` enum.
- `InventoryRepository` interface with `ok | empty | unavailable | not-found` results.
- Production-safe default adapter that returns `unavailable` (no data source configured yet).
- Truthful empty and data-unavailable states on every route; `notFound()` for unknown IDs.
- Synthetic fixtures **only inside tests**; guard test that production code does not import them.
- Tooling: lint, typecheck, unit tests, build scripts; commands documented in `CLAUDE.md`.
- Deployment: none.

Exit criteria: lint/typecheck/tests/build green; routes render correct states with test and
default adapters; no vehicle data in production code.

## Phase 2 — Google Sheets adapter

Skills: `protecting-commercial-truth`, `building-nextjs-storefront`, `verifying-storefront`.

- Verify the live Sheet header against the confirmed schema snapshot in `docs/business-rules.md`;
  stop and reconcile with the user if it differs.
- Choose the server-side auth method for Google Sheets/Drive (service account is a candidate,
  not a decision) and record it.
- Server-only adapter (credentials via env vars) reading "AM Motors — Справочник машин".
- Runtime validation per row; explicit field-by-field mapping; unknown columns ignored.
- Explicit status mapping (`В наличии` → available, `Продана` → sold); anything else → not public.
- `ID` as the public route ID, used verbatim in the URL; empty or duplicate IDs → row not public.
  No strict format regex (observed `AM-###` is not a confirmed rule).
- `Цена, AED` and `Пробег, км` have numeric effective values in the Sheet (AED/km come from
  number formatting): read effective (unformatted) values into numeric `priceAed` /
  `mileageKm`; never parse formatted display strings.
- Caching with an agreed revalidation window and tags for future on-demand revalidation.
- Tests with synthetic rows for mapping, invalid data, private-field exclusion, status mapping.

## Phase 3 — Google Drive media pipeline

Skills: `protecting-commercial-truth`, `building-nextjs-storefront`, `verifying-storefront`.

- Resolve each vehicle's linked Drive folder server-side; list images/video.
- Ordering and cover rules per business; exclusion rules (documents, plates, people).
- Serve optimized images via a controlled host/pipeline; strip EXIF/GPS; no public Drive links.
- Missing media → neutral placeholder state, never stock images.

## Phase 4 — Storefront UX

Skills: `designing-automotive-storefront`, `protecting-commercial-truth`,
`building-nextjs-storefront`, `verifying-storefront`.

- Benchmark research recorded in `docs/ux-benchmark.md` before material decisions.
- Visual direction, homepage, inventory list, vehicle cards, VDP (gallery, facts, CTAs, states),
  sold-car section. Mobile first.
- Filters/search only if inventory size and evidence justify them.

## Phase 5 — Conversion and attribution

Skills: `designing-automotive-storefront`, `protecting-commercial-truth`,
`building-nextjs-storefront`, `verifying-storefront`.

- WhatsApp CTA with car-specific prefill; "Request a viewing" / "Request a test drive" flows as
  confirmed ("Book" only once a real scheduling system exists).
- General-request path: "Didn't find what you need?" → WhatsApp.
- UTM / ad-click attribution carried into inquiries; analytics and ad pixels only as confirmed,
  with consent handling as required.
- Inquiry handoff destination (e.g. WhatsApp only, email, CRM) confirmed with the business;
  qualification happens downstream in Sales / Lead Conversion, not in the storefront.

## Phase 6 — Vercel preview and real-browser verification

Skills: `verifying-storefront`, `building-nextjs-storefront`.

- Vercel project with server-only env vars; protected/noindex previews.
- Full verification plus `release-checklist.md` on preview with real Sheet data, reviewed with
  the business; real-device checks.
- Production launch only after explicit user approval (separate decision, not part of this plan).

## Phase 7 — Multilingual storefront

Skills: `designing-automotive-storefront`, `protecting-commercial-truth`,
`building-nextjs-storefront`, `verifying-storefront`.

- English (default, original unprefixed URLs), Arabic (full RTL, `/ar…`), Russian (`/ru…`); no
  automatic language redirect; header switcher EN · العربية · RU keeps the same page / vehicle ID.
- Per-language root layouts (`app/(en)`, `app/ar`, `app/ru`) sharing one document and one set of
  route bodies (`app/_site`); catch-all routes give each language its own 404.
- Interface dictionaries, approved categorical display values, localized WhatsApp prefills;
  commercial facts never translated.
- `lang`/`dir`, canonical + hreflang; Arabic companion font; RTL via logical CSS.
- Benchmark recorded in `docs/ux-benchmark.md`; decisions in `docs/business-rules.md`.

## Phase 8 — Website photo publishing + live Drive verification

Skills: `protecting-commercial-truth`, `building-nextjs-storefront`, `verifying-storefront`
(`designing-automotive-storefront` for the photo standard).

- Read-only audit of the real Drive folders; publishing rule confirmed 2026-10-01
  (`docs/business-rules.md` → "Website photos").
- Adapter reads only the single `Website/` child folder of each vehicle folder (exact name,
  fail closed on missing/duplicate/empty), images only (JPEG/PNG/WebP), `01.*` = cover; videos
  off; parent-folder files never listed.
- Live keyless (Vercel OIDC) Drive access verified 2026-10-01 on a Preview with a temporary,
  preview-only read-only diagnostic, removed before review: 20/20 folders accessible, all
  `no-website-folder`.
- `MEDIA_SOURCE` enabled by the user in Preview only (2026-10-01); off in Production.
- Follow-up (2026-10-01): listing cards show the cover (`01.*`) of vehicles with approved
  `Website/` media; text-only card otherwise (`docs/business-rules.md` → "Website photos").
