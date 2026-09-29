# Business rules

Rules marked **Confirmed** come from the business. Everything else is an open question and must
not be implemented as fact. Update this file when the business confirms something; note the date.

## Sources of truth — Confirmed

| Information | Source |
| - | - |
| Vehicle records and all commercial facts | Google Sheet **"AM Motors — Справочник машин"** |
| Vehicle photos / video | Google Drive folders linked to each vehicle |
| Everything else about the business | Only what is recorded in this file |

## Commercial truth — Confirmed

- Never invent or take from old content: price, availability, mileage, specs, condition,
  accident history, discounts, finance, warranty, trade-in, or any other commercial fact.
- Live inventory is not stored in code as a source of truth.
- Internal Sheet fields are never published automatically; the public model is an explicit
  allowlist (see `.claude/skills/protecting-commercial-truth/field-policy.md`).
- Sold cars may be used separately as social proof and must never look Available.

## Scope — Confirmed

- No finance/monthly payment, trade-in, warranty, delivery or similar features until confirmed.
- No marketplace-grade search/filter system for the current small stock.
- Ads for a specific car link to that car's VDP.
- Production deployment is forbidden until explicitly approved.

## Status model — To confirm

| Sheet value | Public meaning | Shown in inventory | VDP |
| - | - | - | - |
| _TBD_ | Available | Yes | Full, all CTAs |
| _TBD_ | Reserved / on hold (if used) | _TBD_ | _TBD wording_ |
| _TBD_ | Sold | Separate sold section only | Sold state, no booking CTAs |
| Any other / empty | Not public | No | 404 |

## Field mapping — To confirm in Phase 2

Sheet column names are not yet mapped. Phase 2 reads the header row, and each column is
classified public / server-only / private here before any code exposes it.

| Sheet column | Classification | Public field | Notes |
| - | - | - | - |
| _TBD_ | | | |

## Open questions

Ask the user; do not assume answers.

1. Exact status values used in the Sheet, and whether "Reserved" is shown publicly.
2. Is there a "publish on website" flag column, or is status alone the publish rule?
3. Stable public vehicle ID: which column (stock number?) — must not shift when rows move.
4. Price display: always shown? Wording when price is missing (e.g. "Price on request")?
   VAT-inclusive? AED formatting?
5. Mileage unit and whether mileage is always public.
6. Is full VIN/chassis ever public? (Default: no.)
7. WhatsApp business number(s) and routing; phone number; showroom address; opening hours.
8. Are viewings and test drives separate requests? Which details are collected?
9. Should Sold VDPs stay online (for old ad links/SEO) and for how long? Indexable or `noindex`?
10. Which sold cars may be shown as social proof, and for how long after sale?
11. Revalidation window: how quickly must a Sheet status change appear on the site?
12. Drive media rules: cover image selection, ordering, plates visible or blurred, video allowed.
13. Language(s) for launch: English only, or also Arabic/Russian?
14. Brand assets: logo, brand colors, fonts — do they exist?
15. Domain and analytics/ad platforms in use (Meta, Google Ads, TikTok) for Phase 5 attribution.
16. Which of finance, trade-in, warranty, delivery, export are actually offered (for later phases)?
