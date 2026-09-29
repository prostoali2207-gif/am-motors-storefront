# AM Motors Storefront

Inventory-first dealership storefront for a UAE car dealer: storefront + small car catalog +
one detail page (VDP) per vehicle. Not a marketplace (not a Dubizzle clone), not a corporate
landing page, not an e-commerce checkout (no cart, no online payment).

Core funnel: ad/traffic → `/cars` or a specific `/cars/[id]` → VDP → WhatsApp / request a
viewing / request a test drive → qualified lead → appointment → sale. Second lead path for cars
not in stock: "Didn't find what you need?" → WhatsApp.

Full context: `docs/product-brief.md`, `docs/business-rules.md`, `docs/ux-benchmark.md`,
`docs/implementation-plan.md`.

## Current status

- Repository operating layer only (CLAUDE.md, project skills, docs). No application code yet.
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
- Stack (from Phase 1): current stable Next.js App Router + TypeScript (strict), Server
  Components by default. Exact versions are pinned when Phase 1 starts — check official
  docs, don't rely on memory.
- Commands (lint, typecheck, test, build) will be documented here once Phase 1 adds them.
- Open questions and unconfirmed business facts live in `docs/business-rules.md` →
  "Open questions". When a task depends on one, ask the user; do not assume.
