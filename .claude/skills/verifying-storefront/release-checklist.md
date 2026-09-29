# Preview release checklist (Phase 6+)

Production deployment remains forbidden until the user explicitly approves it.

```
Preview release:
- [ ] All sections of verifying-storefront passed on the release commit
- [ ] Preview env vars set in Vercel (server-only), none exposed as NEXT_PUBLIC_
- [ ] Preview is access-protected or noindex (no public indexing of previews)
- [ ] Real Sheet data on preview reviewed with the business: prices, statuses, sold cars
- [ ] Every Available car on preview is actually available per the Sheet today
- [ ] Sold cars only in the sold section, never with booking CTAs
- [ ] VDP ad landing URLs resolve to the correct car (spot-check each active ad URL)
- [ ] WhatsApp CTA opens the correct number with the correct car prefilled
- [ ] Drive media: correct car, correct order, no documents/plates/people per policy, EXIF stripped
- [ ] Real-device check on at least one iOS Safari and one Android Chrome
- [ ] Data-unavailable path tested by temporarily breaking credentials on preview
- [ ] Revalidation window confirmed: a status change in the Sheet appears within it
- [ ] Results reported with preview URL, commit SHA and anything not verified
```
