# Field policy

Defines how columns of the Google Sheet "AM Motors — Справочник машин" become public fields.
Based on the authoritative snapshot of the Sheet header recorded in `docs/business-rules.md`.
If the live Sheet header differs from that snapshot, stop and update this file and
`docs/business-rules.md` with the user before changing code.

## Contents
- Classification
- V1 public candidate fields
- Pending business decision
- Private by default
- Server/source-only
- Numeric fields
- Status mapping
- Public route ID
- Fields that do not exist
- Media policy
- Adding or changing a field

## Classification

Every Sheet column is exactly one of:

- **public candidate** — may be rendered and sent to the client, after validation.
- **pending decision** — exists in the Sheet but needs an explicit business decision before any
  public display. Treated as private until decided.
- **private** — never read into the public pipeline, never serialized, never logged.
- **server/source-only** — used server-side (media resolution, freshness) but never serialized
  to the client or rendered.

Default for any column not listed here (including newly added columns): **private**.

## V1 public candidate fields

Mapped field-by-field from existing Sheet columns only.

| Sheet column | Public field | Type | Notes |
| - | - | - | - |
| `ID` | `id` | string | Non-empty, unique; V1 public route ID used verbatim (see below) |
| `Марка` | `make` | string | Whitespace-normalized only |
| `Модель` | `model` | string | Whitespace-normalized only |
| `Комплектация` | `trim` | string \| null | Empty → omitted |
| `Год` | `year` | integer | Validated range; invalid → row not public |
| `Цена, AED` | `priceAed` | number \| null | Numeric effective value in the Sheet (AED is number formatting); empty → approved missing-price wording (open question) |
| `Статус` | `status` | enum | See status mapping; fail closed |
| `Пробег, км` | `mileageKm` | number \| null | Numeric effective value in the Sheet (km is number formatting); empty/invalid → omitted |
| `Региональная спецификация` | `regionalSpec` | string \| null | As written in Sheet |
| `Цвет` | `color` | string \| null | Single color column; no exterior/interior split |
| `Двигатель` | `engine` | string \| null | As written in Sheet; no derived power/displacement |
| `Топливо` | `fuel` | string \| null | As written in Sheet |
| `Коробка` | `transmission` | string \| null | As written in Sheet |
| `Привод` | `drivetrain` | string \| null | As written in Sheet |

Display labels and value normalization (e.g. Russian source values → English UI labels) must
be an explicit, reviewed mapping table; unknown values are shown as written or omitted, never
guessed. Phase 7 table (en / ar / ru): `docs/business-rules.md` → "Languages — Phase 7", code
`src/i18n/vehicle-values.ts` (includes the current colour values). Make, model, trim, ID, price,
mileage, engine and year are never translated.

## Pending business decision

| Sheet column | Default until decided |
| - | - |
| `Состояние` | Private. Not rendered, not in copy, meta or structured data until the business decides whether and how condition is shown publicly. |

## Private by default

Never public, never serialized to the client, never logged with values:

| Sheet column | Reason |
| - | - |
| `VIN` | Identifier; public only with explicit business approval |
| `Аварии / крашеные детали` | History/condition claim; legal and commercial risk |
| `Сервисная история` | History claim; needs verification policy |
| `Владельцев` | History claim |
| `Мулькия до` | Registration document data |
| `Банковский залог` | Financial encumbrance; internal |
| `Мин. цена, AED` | Negotiation floor; strictly internal |
| `Заметки` | Internal notes |

Changing any of these to public requires a recorded business decision in
`docs/business-rules.md` and a new review of copy rules.

## Server/source-only

| Sheet column | Server-side use | Never |
| - | - | - |
| `Ссылка на фото/видео` | Resolve the vehicle's Drive media folder (Phase 3) | Rendered, linked, or sent to the client |
| `Ссылка на пост` | Source reference (e.g. social post) for internal use/attribution design | Rendered or linked publicly unless the business decides otherwise |
| `Дата обновления` | Freshness checks, cache decisions, diagnostics | Shown as a public "updated" claim unless the business decides otherwise |

Phase 2 adapter: none of these columns is fetched yet (data minimization). They are added to
the server-side read only when a phase needs them (media link in Phase 3), and never to the
public `Vehicle`.

## Numeric fields

`Цена, AED` and `Пробег, км` hold numeric effective values; "AED" and "km" are Sheet number
formatting. The adapter reads effective (unformatted) values into `priceAed` / `mileageKm` and
never parses formatted display strings. A non-numeric value is invalid → field omitted and
reported server-side.

## Status mapping

Confirmed values of `Статус`:

| Sheet value | Public status | Listed in /cars | VDP |
| - | - | - | - |
| `В наличии` | `available` | yes | full, all CTAs |
| `Продана` | `sold` | no (separate sold section only) | sold state, no viewing/test-drive CTAs |
| anything else / empty | — (not public) | no | 404 |

- Matching is exact after trimming whitespace; no fuzzy matching, no case-folding tricks
  beyond what is recorded here.
- **Reserved is not confirmed.** Do not create a `reserved` status, mapping, badge or wording.
  If a new status value appears in the Sheet, it stays non-public until the business confirms
  its meaning and the mapping is added here and in `docs/business-rules.md`.

## Public route ID

- `ID` is the V1 public identifier. The URL uses the exact authoritative value, `/cars/<ID>`
  (URL-encoded only where required); lookups match that exact value. No slug or case transform.
- Currently observed pattern: `AM-###` (`AM-001`, `AM-002`, …). It is an observation, not a
  confirmed rule: do not enforce a strict regex or a fixed digit count. A future `AM-1000` must
  not be blocked.
- V1 validation: `ID` must be non-empty and unique. Rows with an empty or duplicate `ID` are
  not public and are reported server-side (by row number only). A stricter format check needs
  explicit business confirmation first.
- Keep using `ID` until the real source shows a stability problem (IDs reused or changed).
  If that happens, stop and raise it with the user; ad links depend on stable URLs.

## Fields that do not exist

The Sheet has no columns for body type, interior color, exterior/interior split, public
description, options/features, horsepower, torque, seats, doors, fuel economy, or similar.
These fields are **not part of the V1 schema** and must not be derived from knowledge of the
car model, VIN decoding, other listings, or photos. If the business wants any of them, a
Sheet column must be added and classified first.

## Media policy

- **Confirmed 2026-09-30:** no website-ready photos exist yet; the current Drive folders are
  working source material, not a website library. Media stays off (`MEDIA_SOURCE` unset) and
  nothing is published automatically; VDPs show "Photos unavailable". See
  `docs/business-rules.md` → "Website photos".
- Only files in the Drive folder referenced by `Ссылка на фото/видео` (direct children; no
  subfolders or shortcuts). Identity = Drive file ID, never the file name.
- Public model: `Vehicle.media: VehicleMedia[]` — opaque hashed ID, `type`, and for images a
  same-origin `/media/…` path. Never the link, folder ID, file ID, file name, owner or EXIF.
- Order is a technical fallback (natural name → upload time → file ID) until the business
  defines cover/order (open question 12); nothing may claim a file is the cover.
- Strip EXIF/GPS metadata from published images (done by the media route's re-encode).
- Exclude files that show documents, plates (business decision), people or paperwork, and ad
  creatives with commercial claims. This cannot be automated without image interpretation, so
  media stays disabled until website photos exist and open question 12 is decided.
- No stock, AI-generated or other-vehicle images as fallbacks.

## Adding or changing a field

1. Confirm the column exists in the Sheet and what it means with the business.
2. Classify it (public candidate / pending / private / server-only) here and in
   `docs/business-rules.md`.
3. Add explicit mapping + validation in the adapter and tests for missing/invalid values.
4. Run the data-leak checks in `verifying-storefront`.
