# Night Shift — accepted storefront visual contract (2026-10-09)

The user chose direction B (Night Shift) from two independently developed HTML prototypes and approved transferring it into the existing AM Motors Next.js storefront. The reference HTML remains a **visual prototype**, not the source of vehicle data.

## Design

- Dark graphite base (#111518), acid-yellow accent (#e6f05c), sharp typography and restrained ruled surfaces. Avoid black-and-gold, gradient SaaS and glass effects.
- Desktop inventory: side-by-side scrollable list and large sticky selected-car panel; honest stock count; no oversized promo hero.
- Mobile inventory: large cover/selected-car panel, clearly visible price and WhatsApp, followed by every vehicle in a tappable list. No desktop miniature.
- Existing VDP structure continues to handle fullscreen Drive-backed photos, title/price, specs and WhatsApp/viewing/test-drive actions, with matching Night Shift style.
- English, Russian and Arabic (RTL) share exactly one data-driven implementation; categorical specs continue through the existing translated display layer.

## Data and conversion invariants

- 14 currently available as observed in the real Google Sheet on October 8; **never hard-code 14**. The current source determines the actual count and which vehicles are available.
- Google Sheets is the source of all public vehicle facts and statuses; Google Drive approved `Website/` media only. Missing media means a plain no-photo state; no generated or substituted vehicles.
- Stock source order is preserved. The optional make chips filter currently available vehicles client-side without inventing other filters or statuses.
- Status `Продана` is excluded from the available catalog; `Резерв` and unknown statuses remain nonpublic. Sold VDP never has contact/test-drive actions.
- WhatsApp prefill retains exact vehicle name, public ID, origin URL, locale and first-touch UTM attribution. No booking claims, finance, warranty or credit claims.
- The existing empty, unavailable, 404, sold, media failure, gallery and mobile sticky action states remain.

## Verification & deployment

- GitHub Actions `Storefront QA` runs `npm run verify`: lint, typecheck, unit tests, Next.js production build.
- Preview Vercel route smoke must cover `/`, `/cars`, `/ru`, `/ar`, localized VDPs, sold/nonpublic states.
- Visual device checks still recommended at 320, 390, 768, 1440px, including scroll, line wrapping, and safe-area CTA. Browser screenshots were not obtained during this initial installation; avoid asserting those checks passed.
- Changes must not alter the Google adapters or public data model. Production release should follow validation.
