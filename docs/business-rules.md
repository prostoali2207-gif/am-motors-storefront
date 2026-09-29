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

## Sheet schema — Confirmed snapshot

Authoritative snapshot of the header row of "AM Motors — Справочник машин" (26 columns).
Classification rules and public field names live in
`.claude/skills/protecting-commercial-truth/field-policy.md`. If the live header differs from
this snapshot, stop and update both files with the user before changing code.

| # | Sheet column | Classification | Public field |
| - | - | - | - |
| 1 | `ID` | Public candidate (V1 route ID) | `id` |
| 2 | `Марка` | Public candidate | `make` |
| 3 | `Модель` | Public candidate | `model` |
| 4 | `Комплектация` | Public candidate | `trim` |
| 5 | `Год` | Public candidate | `year` |
| 6 | `Цена, AED` | Public candidate | `priceAed` |
| 7 | `Статус` | Public candidate (mapped, fail closed) | `status` |
| 8 | `Пробег, км` | Public candidate | `mileageKm` |
| 9 | `Региональная спецификация` | Public candidate | `regionalSpec` |
| 10 | `Цвет` | Public candidate | `color` |
| 11 | `Двигатель` | Public candidate | `engine` |
| 12 | `Топливо` | Public candidate | `fuel` |
| 13 | `Коробка` | Public candidate | `transmission` |
| 14 | `Привод` | Public candidate | `drivetrain` |
| 15 | `Состояние` | Pending business decision (private until decided) | — |
| 16 | `VIN` | Private by default | — |
| 17 | `Аварии / крашеные детали` | Private by default | — |
| 18 | `Сервисная история` | Private by default | — |
| 19 | `Владельцев` | Private by default | — |
| 20 | `Мулькия до` | Private by default | — |
| 21 | `Банковский залог` | Private by default | — |
| 22 | `Ссылка на фото/видео` | Server/source-only (Drive media folder) | — |
| 23 | `Ссылка на пост` | Server/source-only | — |
| 24 | `Мин. цена, AED` | Private by default (negotiation floor) | — |
| 25 | `Заметки` | Private by default | — |
| 26 | `Дата обновления` | Server/source-only | — |

Fields not in this list (body type, interior color, description, options, horsepower, etc.)
do not exist in V1 and must not be derived from knowledge of the car model.

## Status model — Confirmed values

| `Статус` value | Public status | Shown in inventory | VDP |
| - | - | - | - |
| `В наличии` | `available` | Yes | Full, all CTAs |
| `Продана` | `sold` | Separate sold section only | Sold state, no viewing/test-drive CTAs |
| Any other value / empty | Not public | No | 404 |

Reserved / on hold is **not confirmed**. No `reserved` mapping, badge or wording exists until
the business confirms a real Sheet value and its public meaning.

## Public route ID — Confirmed for V1

- The existing `ID` column (format `AM-xxx`) is the V1 public route ID: `/cars/AM-xxx`.
- Keep it unless the real source shows a stability problem (IDs reused, changed or duplicated);
  then raise it with the user before changing URLs.

## Leads — Confirmed

A qualified lead is one of:

1. **Vehicle-specific lead** — started from a VDP or card (WhatsApp, request a viewing, request
   a test drive); the message references the specific car (ID, title, URL).
2. **General request lead** — a customer looking for a car that is not in the catalog now:
   "Didn't find what you need?" → WhatsApp. This path must not promise sourcing, import or
   availability that the business has not confirmed.

## CTA wording — Confirmed until a booking system exists

- Use "Request a test drive" and "Request a viewing".
- Do not use "Book", "Confirm", "Reserve" or wording that implies a confirmed appointment until
  a real scheduling/booking system is confirmed and recorded here.

## Open questions

Ask the user; do not assume answers.

1. Is status alone the publish rule, or should a separate "publish on website" flag be added?
2. Wording when `Цена, AED` is empty (e.g. "Price on request")? VAT-inclusive? AED formatting?
3. Should `Состояние` be shown publicly, and with what allowed values/wording?
4. Is `Пробег, км` always public, or can it be withheld per car?
5. Is full VIN ever public? (Default: no.)
6. Display labels for Russian source values (e.g. `Коробка`, `Топливо`, `Привод`) in English UI.
7. WhatsApp business number(s) and routing; phone number; showroom address; opening hours.
8. Are viewing and test-drive requests separate? Which details are collected? Is any scheduling
   system planned (needed before "Book" wording)?
9. Should Sold VDPs stay online (for old ad links/SEO) and for how long? Indexable or `noindex`?
10. Which sold cars may be shown as social proof, and for how long after sale?
11. Revalidation window: how quickly must a Sheet status change appear on the site?
12. Drive media rules: cover image selection, ordering, plates visible or blurred, video allowed.
13. Language(s) for launch: English only, or also Arabic/Russian?
14. Brand assets: logo, brand colors, fonts — do they exist?
15. Domain and analytics/ad platforms in use (Meta, Google Ads, TikTok) for Phase 5 attribution.
16. Which of finance, trade-in, warranty, delivery, export are actually offered (for later phases)?
17. Exact wording and scope of the "Didn't find what you need?" path (no sourcing promise unless
    confirmed).
