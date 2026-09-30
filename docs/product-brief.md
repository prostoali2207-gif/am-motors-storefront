# Product brief — AM Motors storefront

## What we are building

An **inventory-first dealership storefront** for AM Motors, a car dealer in the UAE: a hybrid of
an automotive storefront, a small car catalog, and a dedicated product page (VDP) for every car.

## What it is not

- Not a Dubizzle-style marketplace or classifieds clone.
- Not a corporate brochure / landing page.
- Not a full e-commerce store: no cart, no checkout, no online payment.

## Funnel

```
traffic / ad
  → /cars (inventory) or /cars/[id] (specific car)
  → vehicle detail page (VDP)
  → WhatsApp / request a viewing / request a test drive
  → inquiry (lead candidate)

traffic → / or /cars → "Didn't find what you need?" → WhatsApp
  → inquiry (lead candidate, general request)
```

Full project chain (the storefront covers only the first two steps):

```
site action / WhatsApp inquiry
  → inquiry / lead candidate
  → Sales / Lead Conversion qualification
  → qualified lead
  → appointment / viewing / test drive
  → sale
```

The website's job ends at an **inquiry / lead candidate**. Qualification is done by
Sales / Lead Conversion in auto-sales-growth-system, which owns the qualification criteria;
the storefront does not decide that a lead is qualified and does not define those criteria.
Appointment and sale happen offline.

Two types of inbound inquiry (neither is automatically a qualified lead):

- **Vehicle-specific inquiry** — started from a VDP or card; the message references that car.
- **General-request inquiry** — a customer looking for a car that is not in the catalog now,
  via "Didn't find what you need?" → WhatsApp. No sourcing or availability promise unless the
  business confirms one.

Until a real scheduling system is confirmed, CTAs say "Request a viewing" / "Request a test
drive", never "Book", so nothing implies a confirmed appointment.

## Principles

1. **Ad → exact car.** An ad for a specific car lands on that car's VDP, not the homepage.
2. **Inventory-first.** Cars are visible quickly; no big decorative hero.
3. **Small stock, simple browsing.** No marketplace-grade search/filters until real inventory
   and UX evidence justify them.
4. **One source of truth.** Vehicle data comes only from the Google Sheet
   "AM Motors — Справочник машин"; media only from linked Google Drive folders.
5. **Commercial truth over conversion tricks.** Nothing invented, nothing stale, nothing internal.
6. **Mobile-first.** Product requirement: every page is designed for phones first. (Traffic
   device share is not yet measured.)
7. **VDP is the key conversion page.**
8. **Sold cars** can support trust in a separate section, but never look Available.
9. **Distinct, credible visual identity** grounded in automotive retail benchmarking, not
   generic AI/SaaS templates.

## Users

- **Ad visitor** — clicked an ad for one car; wants price, photos, key facts, and a fast way to
  ask or request a viewing/test drive.
- **Browser** — found the dealer (search, social, referral); wants to see what's in stock now.
- **Returning customer** — re-checks a car before a viewing; needs a stable URL.
- **Searcher for a car not in stock** — doesn't find a match; needs a low-friction way to tell
  the dealer what they want ("Didn't find what you need?" → WhatsApp).

## Core pages (MVP)

| Route | Purpose |
| - | - |
| `/` | Inventory-first home: available cars fast, minimal brand + contact, "Didn't find what you need?" → WhatsApp |
| `/cars` | Full available inventory; sold section optional and separate; "Didn't find what you need?" → WhatsApp |
| `/cars/[id]` | VDP: gallery, facts, price as provided, WhatsApp/viewing/test-drive CTAs |

## Out of scope until confirmed by the business

Finance / monthly payments, trade-in, warranty, delivery, online reservation or deposit,
insurance, car comparison, saved searches, user accounts. (Multi-language — English, Arabic/RTL,
Russian — was confirmed and added in Phase 7.)

## Success signals (to be instrumented in Phase 5)

- Share of ad sessions landing on the correct VDP.
- VDP → WhatsApp / viewing / test-drive conversion rate.
- Vehicle-specific inquiries (referencing a car) and general-request inquiries, counted separately.
- Qualification outcomes are measured by Sales / Lead Conversion, not by the storefront.
- Zero incidents of wrong price/status or leaked internal data.
