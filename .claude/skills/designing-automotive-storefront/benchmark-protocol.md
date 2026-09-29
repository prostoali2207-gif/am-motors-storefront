# Benchmark protocol

How to gather evidence before a material design decision.

## Contents
- Principles
- Reference set and what each is useful for
- Procedure
- Evidence record format
- What not to do

## Principles

- Study **mechanics** (information order, interaction, trust, conversion), never copy visuals,
  brand assets, copy, or photos.
- Evidence beats memory. Training-data recollection of a site is a hypothesis until observed.
- Mobile first: observe at a phone viewport (e.g. 390×844) before desktop.
- Weigh fit: marketplaces solve large-inventory problems we do not have. Prefer mechanics from
  single-dealer sites for small-stock decisions.

## Reference set

| Reference | Type | Most useful for |
| - | - | - |
| DubiCars | UAE marketplace | Local expectations for card facts, price display, specs (GCC spec etc.) |
| Dubizzle Motors | UAE classifieds | Local VDP fact order, contact/WhatsApp patterns |
| CARS24 UAE | UAE online used-car retailer | Inspection/trust presentation, mobile VDP, booking flows |
| CarSwitch UAE | UAE used-car platform | Trust and inspection signalling, test-drive booking |
| CarMax | US retailer | Inventory browsing, card anatomy, VDP structure at scale |
| Carvana | US online retailer | Mobile VDP, gallery, sticky CTA, transparent fact presentation |
| Auto Trader UK | UK marketplace | Listing clarity, fact tables, data-driven labels (study their rules, don't copy labels) |
| The Elite Cars | UAE dealer | Single-dealer premium stock presentation in the local market |
| Canepa | US specialist dealer | Small curated stock, photography-led storytelling, sold-car archive |

## Procedure

1. Write the question precisely ("Where should the primary CTA sit on a mobile VDP?").
2. Pick 3–5 references most relevant to that question (include ≥1 UAE and ≥1 single-dealer site
   when applicable).
3. Observe live pages (browser/Playwright screenshots when available). If a site blocks access,
   say so and mark conclusions as hypothesis.
4. Record each observation in the format below.
5. Synthesize: common pattern, meaningful variations, and what fits a small-stock UAE dealer.
6. Add durable findings to `docs/ux-benchmark.md` → "Findings log" with the date.

## Evidence record format

```
- Site: CARS24 UAE
  Page: VDP
  Viewport: mobile 390×844
  Observed: 2026-MM-DD
  Mechanic: [what happens, in neutral terms]
  Relevance: [why it matters for our funnel]
  Status: observed | hypothesis
```

## What not to do

- Do not state "all competitors do X" without records for each.
- Do not import marketplace features (saved searches, compare, complex filters, dealer ratings)
  just because big sites have them.
- Do not use screenshots of competitors inside the product or commit them to the repo.
