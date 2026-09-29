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
- `ID` (`AM-xxx`) as the public route ID; malformed/duplicate IDs → row not public.
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
- UTM / ad-click attribution carried into leads; analytics and ad pixels only as confirmed,
  with consent handling as required.
- Lead destination (e.g. WhatsApp only, email, CRM) confirmed with the business.

## Phase 6 — Vercel preview and real-browser verification

Skills: `verifying-storefront`, `building-nextjs-storefront`.

- Vercel project with server-only env vars; protected/noindex previews.
- Full verification plus `release-checklist.md` on preview with real Sheet data, reviewed with
  the business; real-device checks.
- Production launch only after explicit user approval (separate decision, not part of this plan).
