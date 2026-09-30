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

- The existing `ID` column is the V1 public route ID. The URL uses the exact authoritative
  value: `/cars/<ID>`.
- Currently observed pattern: `AM-###` (e.g. `AM-001`, `AM-002`). This is an observation, not a
  confirmed format rule — the business has not confirmed a fixed digit count.
- V1 requirements: `ID` is non-empty and unique. No strict regex; a future value such as
  `AM-1000` must not be blocked for not matching the three-digit pattern.
- Keep it unless the real source shows a stability problem (IDs reused, changed or duplicated);
  then raise it with the user before changing URLs.

## Google Sheets integration — Phase 2 (technical, pending review)

Recorded 2026-09-30. Technical proposals, not business facts; confirm or change in review.

- **Auth (proposed):** dedicated read-only service account, shared on the Sheet as Viewer,
  scope `spreadsheets.readonly`, no project IAM roles. On Vercel: keyless Workload Identity
  Federation via Vercel OIDC (`GOOGLE_AUTH_MODE=vercel-oidc`). A JSON key
  (`service-account-key`) is only a fallback for the local smoke test and should be deleted
  once federation works. Setup: `docs/google-sheets-setup.md`.
- **Live header — Confirmed 2026-09-30:** checked by the business against the live Sheet; it
  matches the 26-column snapshot above exactly, and only the two confirmed status values occur.
- **Data minimization:** one header read, then one `values.batchGet` (`UNFORMATTED_VALUE`)
  for exactly the 14 public-candidate columns; private, pending, server-only and unknown
  columns are never requested. `Ссылка на фото/видео` is not read until Phase 3.
- **Freshness — Accepted for V1 2026-09-30 (open question 11):** mapped public vehicles cached for 60 s
  (tag `inventory`); a snapshot older than 120 s is never served — the request reads the Sheet
  directly or shows `unavailable`. Worst case a `В наличии` → `Продана` change appears within
  ~2 minutes. On-demand revalidation (e.g. a Sheet edit hook calling `revalidateTag`) can
  shorten this later.

## Website photos — Confirmed 2026-09-30

- **There are no website-ready photos yet.** The current Drive folders linked in
  `Ссылка на фото/видео` are working source material (raw shots, ad creatives, duplicates),
  **not** a website media library.
- `MEDIA_SOURCE` stays **off** by default. Existing files — including ad creatives — are never
  published automatically.
- The site shows the neutral "Photos unavailable" state on every VDP until website photos exist.
- Not defined now (deliberately): which files are publishable, cover/order, video, HEIC,
  plates/people/documents. When final website photos are ready, a minimal publishing
  convention is decided separately (open question 12). No Sheet change, no new folders, no CMS
  until then.

## Google Drive media — Phase 3 (technical, pending review)

Recorded 2026-09-30. Technical proposals, not business facts.

- **Source:** only the Drive folder in `Ссылка на фото/видео` (server/source-only). The link and
  folder ID are parsed server-side (`/drive/folders/<id>`, `/drive/u/<n>/folders/<id>`,
  `/drive/mobile/folders/<id>`, `/open?id=<id>`); anything else → media unavailable for that
  vehicle. Only direct children are read (no subfolders, no shortcuts).
- **Identity:** Drive file ID. File names are not unique (observed) and are never used as
  identity, published or logged. Byte-identical copies (same `md5Checksum`) are shown once.
- **Kept:** JPEG, PNG, WebP images (≤ 30 MB source) and videos (`video/*`). Excluded: folders,
  shortcuts, Google Docs, PDFs, HEIC/HEIF (not decodable by the pipeline), GIF, anything else.
- **Order (technical fallback, NOT a business rule):** natural file-name order, then Drive
  upload time, then file ID. The first image is not a declared cover.
- **Delivery:** images only, through the site's route `/media/<ID>/<opaque id>/<revision>` —
  downloaded server-side, EXIF/GPS/all metadata stripped, re-encoded as JPEG (max 2048 px),
  `next/image` builds responsive sizes from it. Videos: no public delivery yet (not rendered).
- **Where media is resolved:** only for one vehicle's VDP (`getById`) and the media route.
  `/` and `/cars` (listing reads) return `media: []` and make 0 Drive calls; nothing is
  prefetched. Listing cards show no media.
- **Cache (V1, no purge tooling):** `/media` responses `public, max-age=1200, s-maxage=1200`
  and `images.minimumCacheTTL = 1200` (Next 16 caches optimized images for the larger of the
  two and sends that to browsers). Worst case a removed photo can still be served ≈ 1 hour
  (route CDN copy → optimized copy → browser copy, 20 min each). Content-versioned URLs: a
  replaced photo gets a new URL at once. Policy: `src/lib/media-cache-policy.ts`.
- **Customer-facing states:** photos, or neutral "Photos unavailable". No placeholder car image.
- **Switch:** `MEDIA_SOURCE=google-drive`, off by default. Stays off (see "Website photos —
  Confirmed" above) until website photos exist and open question 12 is decided.

## Inquiries and lead qualification — Confirmed

Project chain:

```
site action / WhatsApp inquiry
  → inquiry / lead candidate
  → Sales / Lead Conversion qualification
  → qualified lead
  → appointment / viewing / test drive
  → sale
```

- The storefront produces **inquiries (lead candidates)**. It never marks, labels or reports an
  inquiry as a qualified lead.
- Qualification criteria belong to Sales / Lead Conversion in auto-sales-growth-system. They are
  not defined, duplicated or implemented in this repository.

Two types of inbound inquiry (neither is automatically a qualified lead):

1. **Vehicle-specific inquiry** — started from a VDP or card (WhatsApp, request a viewing,
   request a test drive); the message references the specific car (ID, title, URL).
2. **General-request inquiry** — a customer looking for a car that is not in the catalog now:
   "Didn't find what you need?" → WhatsApp. This path must not promise sourcing, import or
   availability that the business has not confirmed.

## Contact and inquiries — Confirmed 2026-09-30

- **WhatsApp business number: +971 50 343 2337** (canonical wa.me digits `971503432337`).
  Public business information, not a secret; defined once in `src/conversion/whatsapp.ts`.
- **No scheduling / booking system in V1.** "Request a viewing" and "Request a test drive" are
  separate inquiry intents; both only open WhatsApp with a different prefilled message. They do
  not book a time, confirm an appointment, reserve a car or create a qualified lead — they
  create an inquiry (lead candidate) only. Qualification stays in Sales / Lead Conversion.
- **Handoff destination: WhatsApp only.** No database, CRM, API endpoint, form or lead table on
  the site. Nothing is sent anywhere except by the visitor's own click and send in WhatsApp.
- **Vehicle actions (available VDPs only):** WhatsApp (primary), Request a viewing, Request a
  test drive (secondary). Sold VDPs have no inquiry, viewing or test-drive actions.
- **Prefill templates** (title = public `year make model trim`, ID = public `ID`, URL = the
  current VDP URL; nothing else — no price, status, condition, finance or promises):

  | Intent | Message |
  | - | - |
  | General vehicle question | `Hi, I'm interested in [vehicle title] (Ref: [public ID]).`<br>`[vehicle URL]` |
  | Viewing | `Hi, I'd like to request a viewing for [vehicle title] (Ref: [public ID]).`<br>`[vehicle URL]` |
  | Test drive | `Hi, I'd like to request a test drive for [vehicle title] (Ref: [public ID]).`<br>`[vehicle URL]` |
  | General request | `Hi, I couldn't find the car I'm looking for on the website. Can you help me with current availability?` |

- **General request:** heading "Didn't find what you need?" on the homepage and `/cars` after the
  available inventory (and in the empty / unavailable states). No sourcing or import promise.
- **Attribution (minimal, first-party):** only `utm_source`, `utm_medium`, `utm_campaign`,
  `utm_content`, `utm_term`, `fbclid` are captured, first touch per browser-tab session
  (`sessionStorage`, no cookies, no third-party SDK, no pixels). When any exist, a block with
  only the received values is appended to the WhatsApp prefill (`Source:`, `Medium:`,
  `Campaign:`, `Content:`, `Term:`, `fbclid:`). fbclid is kept as a click ID; no campaign or
  source is derived from it. Isolated in `src/attribution/` so an analytics/CRM handoff can
  replace it. Tracking pixels and analytics wait for open question 15.

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
7. ~~WhatsApp business number~~ — confirmed 2026-09-30 (see "Contact and inquiries"). Still
   open: routing to several numbers, phone number, showroom address, opening hours.
8. ~~Viewing vs test drive~~ — confirmed 2026-09-30: separate intents, both WhatsApp prefills,
   no scheduling system in V1, no extra details collected on the site.
9. Should Sold VDPs stay online (for old ad links/SEO) and for how long? Indexable or `noindex`?
10. Which sold cars may be shown as social proof, and for how long after sale?
11. Revalidation window: how quickly must a Sheet status change appear on the site?
    (Accepted for V1 on 2026-09-30: ≤ 2 minutes — 60 s cache, 120 s hard max age.)
12. Website photo publishing convention — **deferred by business decision (2026-09-30)**:
    no website-ready photos exist yet (see "Website photos — Confirmed"). Decide only when
    final website photos are ready. Background (observed 2026-09-30, metadata only): current
    folders mix real photos with ad creatives (e.g. a file named as an ad with a payment-terms
    claim not confirmed in this file, "hero still" artwork, carousels), duplicate uploads and
    empty folders; the pipeline cannot tell a photo from an ad or a document without
    interpreting image content, which is not allowed. Topics to settle then, minimally:
    a. Which files are publishable (e.g. a dedicated folder or filename convention, or an
       explicit list in the Sheet).
    b. Cover image and order (numeric filename prefixes `01_`, `02_` already work with the
       current technical order).
    c. Plates visible or blurred; people/documents never published — who checks?
    d. Video on the site at all; if yes, delivery (public video host or a transcoded asset
       store — external infrastructure, needs approval; serverless proxying of `.MOV`
       originals is not an option).
    e. HEIC photos: convert before upload, or approve a conversion step.
    f. Urgent removal: V1 caches bound it to ≈ 1 hour; faster removal needs purge tooling.
13. Language(s) for launch: English only, or also Arabic/Russian?
14. Brand assets: logo, brand colors, fonts — do they exist?
15. Domain and analytics/ad platforms in use (Meta, Google Ads, TikTok). Still open: Phase 5
    carries UTM/fbclid into WhatsApp messages only; no pixels or analytics until decided
    (with consent handling as required). No site domain is configured; VDP URLs in messages use
    the origin the visitor actually used.
16. Which of finance, trade-in, warranty, delivery, export are actually offered (for later phases)?
17. ~~"Didn't find what you need?" wording~~ — confirmed 2026-09-30 (see "Contact and
    inquiries"). Sourcing/import remains unconfirmed and is not promised.
18. Should a sold car's page or sold section show its last listed price? (Default until decided:
    no price on sold cars.)
