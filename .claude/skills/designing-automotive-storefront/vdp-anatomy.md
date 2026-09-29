# VDP anatomy

Baseline structure for `/cars/[id]`. Validate section order with benchmark evidence before
finalizing; this is a starting hypothesis, not a verified standard.

## Contents
- Mobile section order
- Sticky CTA
- State matrix
- Content rules

## Mobile section order (hypothesis to validate)

1. Gallery — first image loads fast (priority), swipeable, counter ("1 / 24"), full-screen view.
2. Title block — year, make, model, trim (only fields that exist); "Sold" badge for sold cars.
3. Price block — exactly as provided by the Sheet; no computed discounts or monthly figures.
4. Primary CTAs — WhatsApp (prefilled with car + link), "Request a viewing", "Request a test drive".
5. Key facts — short grid of public-model facts that have values (mileage, year, regional
   spec, transmission, fuel, drivetrain, engine, color — see field-policy.md).
6. Full specs — remaining public-model fields only; missing values omitted, not "N/A" filler.
   There is no description, body type or options field in V1; do not invent them.
7. Dealer trust — real address/hours/contact only once confirmed by the business.
8. Related available cars — optional, only when stock allows; never shows Sold cars as options.

Desktop: gallery + sticky side panel (title, price, CTAs) is the common pattern to evaluate.

## Sticky CTA (mobile)

- Appears once the in-page CTA block scrolls out of view; contains the primary action
  (WhatsApp) and one secondary action at most.
- Respects `env(safe-area-inset-bottom)`, does not cover the last content, ≥44×44 px targets.
- Hidden for Sold vehicles.

## State matrix

| State | Page behavior |
| - | - |
| Available | Full VDP, all CTAs |
| Sold | "Sold" badge, no test-drive/viewing CTAs, optional link to available stock; `noindex` decision per business rules |
| Unknown / unmapped status (incl. any "reserved"-like value) | Not public → 404 |
| ID not found | 404 with link to `/cars` |
| Data source unavailable | Non-cached error state with contact option; never stale "Available" |
| Missing media | Hide the gallery or show a neutral "Photos unavailable" state; no promise of future photos; never a stock or AI car image |
| Missing price | Behavior defined by business (open question); never invented |

## Content rules

- Every visible fact comes from the public vehicle model (see `protecting-commercial-truth`).
- No marketing claims about condition, history or warranty unless the Sheet has an approved field.
- Headline/meta description are templated from allowlisted fields only.
