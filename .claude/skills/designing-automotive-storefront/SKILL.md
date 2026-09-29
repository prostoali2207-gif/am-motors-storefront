---
name: designing-automotive-storefront
description: Guides UX, product architecture and visual direction for the AM Motors inventory-first dealership storefront (UAE). Use when designing or changing the homepage, /cars inventory listing, vehicle cards, the vehicle detail page (VDP), filters or search, navigation, mobile layout and hierarchy, CTAs (WhatsApp, viewing, test drive), trust elements, sold-car social proof, empty states, copy tone, typography, color or any visual/layout decision. Requires benchmark evidence from automotive e-commerce and dealership sites before material design decisions, and blocks generic AI website aesthetics.
---

# Designing the automotive storefront

The product is an inventory-first dealership storefront: storefront + small catalog + one VDP per
car. Every design decision serves the funnel:

ad/traffic → `/cars` or `/cars/[id]` → VDP → WhatsApp / viewing / test drive → lead → appointment.

Read `docs/product-brief.md` and `docs/business-rules.md` before the first design task in a session.

## Workflow

Copy this checklist into the response and tick it off:

```
Design task progress:
- [ ] 1. State the decision and which funnel step/page it affects
- [ ] 2. Check business rules (scope, unconfirmed features, sold-car rules)
- [ ] 3. Gather benchmark evidence (benchmark-protocol.md) for material decisions
- [ ] 4. Propose the design with rationale tied to evidence and our constraints
- [ ] 5. Run the anti-pattern review below
- [ ] 6. Specify every state: loading, empty, data-unavailable, missing fields, sold
- [ ] 7. Hand vehicle facts/copy to protecting-commercial-truth; code to building-nextjs-storefront
```

### What counts as a "material" decision

Needs benchmark evidence: page structure and section order, VDP layout, card anatomy, CTA
placement/labels, sticky mobile bars, gallery behavior, filter/search introduction, navigation
model, trust elements, sold-car presentation, visual direction (type, color, density).

Does not need it: spacing tweaks, copy typo fixes, bug fixes that keep the approved design.

### Evidence standard

Follow [benchmark-protocol.md](benchmark-protocol.md). In short: cite the reference site, page type,
viewport, date observed, and what mechanic it demonstrates. Mark anything you could not observe
directly as **hypothesis**. Never claim a competitor does something you did not verify. Record
durable findings in `docs/ux-benchmark.md`.

Benchmark set (study mechanics, never copy visuals): DubiCars, Dubizzle Motors, CARS24 UAE,
CarSwitch UAE, CarMax, Carvana, Auto Trader UK, The Elite Cars, Canepa.

## Page principles

**Homepage** — inventory-first. Available cars visible within the first mobile viewport or one
short scroll. No oversized decorative hero, no stock photography of generic cars, no autoplay
video hero. Minimal brand strip + contact entry point + inventory. Sold cars, if shown, go in a
separate, clearly labelled section below available stock.

**/cars (inventory)** — small stock means a simple, scannable list/grid. Default sort must be
defined and justified (e.g. newest listed). No filter panel until inventory size and evidence
justify it; the first justified step is usually a small set of chips (e.g. body type or make),
not a sidebar. Always design the empty and data-unavailable states — they are real production
states, not edge cases. Include a "Didn't find what you need?" → WhatsApp entry point for
customers looking for a car not in the catalog (general-request lead).

**Vehicle card** — one primary image, title (year make model trim as available), price or an
explicit "price on request" state *only if the business confirms that wording*, a Sold badge
where sold cars are shown, 2–4 key facts that exist in the public model (field-policy.md).
Reserved is not a confirmed status — no Reserved badge. No invented badges ("Great deal",
"Low mileage", "Certified") unless the business defines them and data supports them.

**VDP** — primary conversion page. See [vdp-anatomy.md](vdp-anatomy.md) for the section order,
mobile sticky CTA and state matrix.

**Sold cars** — may be social proof, never look Available: distinct badge, no "Request a test drive"
or "Request a viewing" CTA, excluded from the Available inventory list and from ad landing flows by default.

## CTAs and conversion

- Vehicle actions: WhatsApp, "Request a viewing", "Request a test drive". Labels are concrete
  verbs. Never "Book", "Confirm" or "Reserve" until a real scheduling system is confirmed in
  `docs/business-rules.md` — the wording must not imply a confirmed appointment.
- A vehicle WhatsApp message is prefilled with the specific car (title + public ID/URL) so the
  lead arrives qualified.
- General-request path: "Didn't find what you need?" → WhatsApp, for customers looking for a car
  not in the catalog. Place it where browsing ends (end of /cars, empty state, homepage). Do not
  promise sourcing, import or availability unless confirmed.
- Attribution details belong to Phase 5.
- On mobile, the primary CTA stays reachable (sticky bottom bar) without covering content or
  system UI; respect safe-area insets.
- Do not add finance calculators, monthly payment, trade-in, warranty, delivery or "reserve
  online" CTAs unless confirmed in `docs/business-rules.md`.

## Visual direction

Aim for a credible, product-led automotive retail look: the cars and their photos carry the page.

- Photography first; UI chrome recedes. Real vehicle media from Drive only.
- Neutral, high-contrast base with at most one restrained accent used for actions.
- Typography chosen for legibility of numbers (price, mileage, year) — tabular figures.
- Density closer to automotive retail than to marketing landing pages.
- Arabic/RTL readiness is not in scope unless confirmed, but avoid layouts that make it impossible.

## Anti-pattern review (block these)

- SaaS hero templates, big gradient headlines, "Welcome to the future of car buying".
- Purple/blue gradients, glassmorphism or blur used as decoration, neon glows.
- Fake dashboards, fake stats ("10,000+ happy customers"), fake reviews or ratings.
- Generic black-and-gold "luxury" styling, gold serif logos, marble textures.
- Stock photos, AI-generated car images, placeholder cars in production UI.
- Carousels for primary content, autoplay media, hidden prices behind forms (unless confirmed).
- Urgency tricks ("3 people viewing now", countdowns) not backed by real data.
- Features outside scope (finance, trade-in, warranty, delivery) sneaking in via UI.

If a proposal hits any item, revise before presenting it.

## Output format for design proposals

```markdown
## Decision
[What is being decided, which page/funnel step]

## Evidence
- [Site] · [page type] · [mobile/desktop] · [date observed] — [mechanic observed]
- Hypothesis (not verified): [...]

## Proposal
[Structure, hierarchy, states, CTA behavior — mobile first, then desktop]

## Constraints check
[Business rules / commercial-truth implications / out-of-scope items avoided]

## Open questions
[Anything that needs business confirmation]
```
