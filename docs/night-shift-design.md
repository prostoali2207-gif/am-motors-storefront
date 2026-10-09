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


## Photo-first inventory correction (2026-10-09)

User feedback after reviewing the production phone screenshot: requiring a tap on a text row to update the separate image panel was unnecessary. **Approved interaction change:** visitors should scroll vertically through large individual cards, each showing its own available car photograph, price and facts immediately, as in the former concept A, but keeping Night Shift's dark palette and editorial typography.

- Remove the selected-car/preview/arrow pattern on all breakpoints. On phones render one generous vehicle photo card per row; on desktop two columns of full product cards.
- The cover, visible name, public price, key facts, car-specific WhatsApp link and details link belong to **each** card. The image and title open the true vehicle detail URL.
- Photos come solely from approved Google Drive `Website/` covers already provided by the media adapter. Pending photos are shown as a short truthful unavailable note; never invent or reuse other cars or a fake photo.
- Preserve filtering by make and server-supplied order; count all currently available vehicles, never a hardcoded 14.
- Localized English/Arabic (RTL)/Russian labels, source-of-truth status, no sold cards, origin-based WhatsApp prefill and UTM attribution remain unchanged.
- No carousel, swipe trap or intermediate selection on phones. Scrolling the page is the sole way to browse available vehicle cards.
- Cover images have deliberately bounded aspect ratio and load lazily except the first visible card. Preserve a sensible crop and no horizontal overflow at 320/360/390/768/1440.
- Existing VDP gallery and sticky WhatsApp/viewing/test-drive flows are out of scope.
