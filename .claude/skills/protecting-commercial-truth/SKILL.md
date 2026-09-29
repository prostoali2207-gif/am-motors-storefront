---
name: protecting-commercial-truth
description: Enforces commercial truth for AM Motors vehicle data and blocks fabricated, stale or internal facts. Use whenever work touches inventory, price, availability or status (Available, Reserved, Sold), mileage, specs, condition, accident or service history, discounts, finance, warranty, trade-in, the Google Sheet "AM Motors — Справочник машин", Google Drive vehicle photos/video, the public Vehicle data model or allowlist, data adapters and mapping, fixtures or seed data, customer-facing vehicle copy, SEO titles and meta, structured data, ad landing pages or WhatsApp message templates that mention a car.
---

# Protecting commercial truth

A wrong price, a sold car shown as Available, or a leaked internal note is a business and legal
risk. This skill decides **what vehicle information may exist in the product and where it may
come from**.

## Sources of truth

| Information | Only authoritative source |
| - | - |
| Vehicle records and all commercial facts | Google Sheet **"AM Motors — Справочник машин"** |
| Vehicle photos and video | Google Drive folders linked to the vehicle |
| Business facts (address, hours, phone/WhatsApp, policies) | Confirmed by the business and recorded in `docs/business-rules.md` |

Nothing else is a source: not old websites, not ads, not listing portals, not memory, not
"reasonable defaults", not the model's general knowledge of a car model.

## Hard rules

1. **Never fabricate.** Do not invent, estimate, round, "typical-value" or back-fill price,
   status, mileage, year, trim, specs, options, condition, accident/service history, owners,
   discounts, finance/monthly payments, warranty, trade-in, delivery or any commercial fact.
2. **Never reuse stale content.** Old site copy, screenshots, portal listings or ad text are not
   evidence of current facts.
3. **Missing means missing.** If a field is empty or invalid, the UI omits it or shows an approved
   "on request" state. Never fill with a guess or a manufacturer default spec.
4. **No live inventory in code.** No hard-coded vehicle lists, JSON dumps, seed files or CMS
   copies of Sheet data in the app. Synthetic fixtures live only under test directories and are
   obviously fake (e.g. make `"Testmake"`, ID `test-0001`).
5. **Explicit public allowlist.** Only fields listed in the public Vehicle model are exposed.
   Mapping is written field-by-field; never spread/serialize a raw Sheet row. New Sheet columns
   are private by default. See [field-policy.md](field-policy.md).
6. **Fail closed on status.** Only statuses explicitly mapped as public are shown. Unknown,
   empty or unmapped status → vehicle is not public. Sold is never rendered as Available.
7. **Fail closed on the source.** If the Sheet cannot be read or validated, show the
   data-unavailable state. Never fall back to bundled data or to a stale cache that could show a
   sold car as Available beyond the agreed revalidation window.
8. **Unconfirmed features stay out.** Finance, trade-in, warranty, delivery, reservations and
   similar are not shown, not implied in copy, and not in structured data until confirmed in
   `docs/business-rules.md`.

## Review workflow

Run this for any change that touches vehicle data, media, or vehicle copy:

```
Commercial truth review:
- [ ] Every displayed vehicle fact traces to a public-model field sourced from the Sheet
- [ ] No hard-coded vehicle data outside test directories
- [ ] Mapping is explicit per field; no raw row spread; new columns private by default
- [ ] Status mapping is explicit; unknown → hidden; Sold never looks Available
- [ ] Missing/invalid values handled by omission or approved wording, not guesses
- [ ] Media comes only from the vehicle's Drive folder; no stock/AI/placeholder cars
- [ ] Copy, meta, JSON-LD, OG tags and WhatsApp templates use only public fields
- [ ] No unconfirmed commercial claims (finance, warranty, trade-in, delivery, discounts)
- [ ] Nothing internal reaches client bundles, HTML, RSC payloads, logs or error messages
```

If any item fails, fix it before continuing. If a fix needs a business decision, stop and ask
the user; record the question in `docs/business-rules.md` → "Open questions".

## Customer-facing copy

- Generated copy (titles, descriptions, meta, ads, WhatsApp prefill) is templated from public
  fields. No adjectives that assert facts ("accident-free", "full service history", "like new",
  "best price", "low mileage") unless an approved Sheet field states it.
- Price is displayed exactly as the Sheet provides it, with currency formatting only
  (AED formatting rules are an open question until confirmed). No "was/now", no computed savings.
- See [copy-rules.md](copy-rules.md) for allowed and blocked phrasing.

## Red flags that must stop the task

- A request to "just put some example cars" on a production route.
- A request to copy data from another site, an old site, or a PDF instead of the Sheet.
- A mapping like `{...row}` or `Object.assign(vehicle, row)`.
- A status default like `status ?? "Available"`.
- Real Sheet rows pasted into code, tests, issues or PR descriptions.

Explain the rule, propose the compliant alternative, and ask before proceeding.
