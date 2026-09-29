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
  → WhatsApp / request viewing / book test drive
  → qualified lead → appointment → sale
```

The website's job ends at a **qualified lead** that names a specific car. Appointment and sale
happen offline.

## Principles

1. **Ad → exact car.** An ad for a specific car lands on that car's VDP, not the homepage.
2. **Inventory-first.** Cars are visible quickly; no big decorative hero.
3. **Small stock, simple browsing.** No marketplace-grade search/filters until real inventory
   and UX evidence justify them.
4. **One source of truth.** Vehicle data comes only from the Google Sheet
   "AM Motors — Справочник машин"; media only from linked Google Drive folders.
5. **Commercial truth over conversion tricks.** Nothing invented, nothing stale, nothing internal.
6. **Mobile-first.** Most ad traffic arrives on phones.
7. **VDP is the key conversion page.**
8. **Sold cars** can support trust in a separate section, but never look Available.
9. **Distinct, credible visual identity** grounded in automotive retail benchmarking, not
   generic AI/SaaS templates.

## Users

- **Ad visitor** — clicked an ad for one car; wants price, photos, key facts, and a fast way to
  ask or book. Mostly mobile.
- **Browser** — found the dealer (search, social, referral); wants to see what's in stock now.
- **Returning lead** — re-checks a car before a viewing; needs a stable URL.

## Core pages (MVP)

| Route | Purpose |
| - | - |
| `/` | Inventory-first home: available cars fast, minimal brand + contact |
| `/cars` | Full available inventory; sold section optional and separate |
| `/cars/[id]` | VDP: gallery, facts, price as provided, WhatsApp/viewing/test-drive CTAs |

## Out of scope until confirmed by the business

Finance / monthly payments, trade-in, warranty, delivery, online reservation or deposit,
insurance, car comparison, saved searches, user accounts, multi-language, Arabic/RTL.

## Success signals (to be instrumented in Phase 5)

- Share of ad sessions landing on the correct VDP.
- VDP → WhatsApp / viewing / test-drive conversion rate.
- Leads that reference a specific car.
- Zero incidents of wrong price/status or leaked internal data.
