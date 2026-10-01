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

## Website photos — Confirmed 2026-09-30, publishing rule confirmed 2026-10-01 (Phase 8)

- The vehicle folders linked in `Ссылка на фото/видео` are working source material (raw shots,
  ad creatives, documents, duplicates, videos), **not** a website media library. Nothing in a
  vehicle folder itself is ever published.
- **Publishing rule (confirmed 2026-10-01):**
  1. Each vehicle folder may contain one direct child folder named exactly **`Website`**
     (case-sensitive; `website`, `Website ` or `Website photos` do not count).
  2. The storefront reads media **only** from that `Website` folder — its direct children. No
     fallback to the vehicle folder, no recursion into folders inside `Website`.
  3. No `Website` folder, more than one `Website` folder, an empty `Website` folder, or one with
     no supported image → that vehicle fails closed: "Photos unavailable".
  4. Files: **JPEG, PNG, WebP** only (≤ 30 MB). HEIC, GIF, RAW/DNG-as-other-type, PDFs, Google
     Docs, shortcuts and videos are ignored. Byte-identical copies are shown once.
  5. Order by file name: `01.*` = **cover**, then `02.*`, `03.*` … (natural order: `9` before
     `10`; ties by upload time, then file ID).
  6. **The human publishing action is placing an approved image into `Website/`.** Never place
     there: files from the vehicle root folder as-is without review, videos, ad creatives /
     collages / overlays (e.g. "CASH ONLY"), VIN labels or any document, odometer photos,
     people, readable vehicle plates, third-party dealer signs or phone numbers. The pipeline
     cannot judge image content; this check is the reviewer's responsibility.
  7. One approved exterior photo is enough to publish media. No placeholder or duplicated
     padding.
  8. **Videos remain off** (not published, not rendered).
- Removal: delete or move an image out of `Website/`. Pages stop referencing it within ~5 min
  (folder listing cache); a cached copy can be served for up to ≈ 1 hour (no purge tooling in V1).
- Live check 2026-10-01 (Vercel Preview, keyless OIDC, read-only): all 20 vehicle folders are
  readable by the service account; none has a `Website` folder yet → every VDP would show
  "Photos unavailable" even with media enabled.
- `MEDIA_SOURCE=google-drive` was enabled by the user in **Preview only** (2026-10-01); it stays
  **off** in Production until the user explicitly enables it.
- **Listing cards (confirmed by the user 2026-10-01, supersedes the Phase 4 mixed-stock rule):**
  every card on `/` and `/cars` whose vehicle has approved `Website/` media shows that vehicle's
  cover (the first image in order, `01.*`) above the eyebrow — one image, no carousel. A vehicle
  without an approved image keeps the text-only card: no empty box, no placeholder. Mixed stock
  (some cards with photos, some without) is accepted. Nothing from the vehicle root folder, no
  videos, no unsupported files.

## Google Drive media — Phase 3 (technical, pending review)

Recorded 2026-09-30. Technical proposals, not business facts.

- **Source:** only the `Website` child folder of the Drive folder in `Ссылка на фото/видео`
  (Phase 8; see "Website photos" above). The link and folder ID are parsed server-side
  (`/drive/folders/<id>`, `/drive/u/<n>/folders/<id>`,
  `/drive/mobile/folders/<id>`, `/open?id=<id>`); anything else → media unavailable for that
  vehicle. In the vehicle folder only child *folders* named `Website` are queried (its files are
  never listed); then only the direct children of that one `Website` folder are read (no
  subfolders, no shortcuts).
- **Identity:** Drive file ID. File names are not unique (observed) and are never used as
  identity, published or logged. Byte-identical copies (same `md5Checksum`) are shown once.
- **Kept:** JPEG, PNG, WebP images (≤ 30 MB source). Excluded: videos (Phase 8: off), folders,
  shortcuts, Google Docs, PDFs, HEIC/HEIF (not decodable by the pipeline), GIF, anything else.
- **Order (confirmed Phase 8):** natural file-name order (`01.*` = cover), then Drive upload
  time, then file ID.
- **Delivery:** images only, through the site's route `/media/<ID>/<opaque id>/<revision>` —
  downloaded server-side, EXIF/GPS/all metadata stripped, re-encoded as JPEG (max 2048 px),
  `next/image` builds responsive sizes from it. Videos: never published.
- **Where media is resolved:** VDP (`getById`, all approved images), the media route, and
  listing reads (`/`, `/cars`: cover only, one image per vehicle, for the card). Listing covers
  use the same cached per-folder resolution (≤ 3 metadata calls per linked vehicle on a cold
  5-minute cache, 0 when warm; at most 6 vehicles resolved at once; no image bytes). Card links
  keep `prefetch={false}`, so no VDP is rendered in the background.
- **Cache (V1, no purge tooling):** `/media` responses `public, max-age=1200, s-maxage=1200`
  and `images.minimumCacheTTL = 1200` (Next 16 caches optimized images for the larger of the
  two and sends that to browsers). Worst case a removed photo can still be served ≈ 1 hour
  (route CDN copy → optimized copy → browser copy, 20 min each). Content-versioned URLs: a
  replaced photo gets a new URL at once. Policy: `src/lib/media-cache-policy.ts`.
- **Customer-facing states:** photos, or neutral "Photos unavailable". No placeholder car image.
- **Switch:** `MEDIA_SOURCE=google-drive`, off by default. Enabled in Preview only by the user
  (2026-10-01); stays off in Production until the user explicitly enables it.

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
  `utm_content`, `utm_term` are captured, first touch per browser-tab session
  (`sessionStorage`, no cookies, no third-party SDK, no pixels). When any exist, a block with
  only the received values is appended to the WhatsApp prefill (`Source:`, `Medium:`,
  `Campaign:`, `Content:`, `Term:`). Nothing is inferred or filled in. Isolated in
  `src/attribution/` so an analytics/CRM handoff can replace it. Tracking pixels and analytics
  wait for open question 15.
- **Ad click IDs (`fbclid`, `gclid`, …) are not captured in V1** (review of PR #6,
  2026-09-30): they are long opaque IDs that would be shown to the customer in the prefill, and
  no analytics/CRM consumes them yet. Add them only once open question 15 is resolved and a real
  downstream consumer exists; never infer a source from them.

## CTA wording — Confirmed until a booking system exists

- Use "Request a test drive" and "Request a viewing".
- Do not use "Book", "Confirm", "Reserve" or wording that implies a confirmed appointment until
  a real scheduling/booking system is confirmed and recorded here.

## Languages — Phase 7 (confirmed by the user 2026-09-30)

- **Languages:** English (default), Arabic (full RTL), Russian. Resolves open question 13.
- **URLs:** English keeps the original unprefixed URLs (`/`, `/cars`, `/cars/<ID>`) so existing
  and ad links never break. Arabic: `/ar`, `/ar/cars`, `/ar/cars/<ID>`. Russian: `/ru`,
  `/ru/cars`, `/ru/cars/<ID>`. The vehicle ID is the same verbatim Sheet `ID` in every language.
- **No automatic redirect** by browser language. An explicit switcher (EN · العربية · RU, no
  flags) keeps the visitor on the same page (homepage, `/cars`, or the same vehicle ID).
- **SEO:** `<html lang dir>` per language; self-referencing canonical and `hreflang` en / ar /
  ru + `x-default` (English) built from the origin the visitor used (no domain configured,
  q 15). Indexing rules unchanged (sold VDP indexing is still q 9).
- **Never translated or altered:** make, model, trim, ID, price, mileage, engine, year.
  Figures stay identical; only digit grouping follows the language (Western digits everywhere).
- **Currency — Confirmed 2026-09-30:** `AED` on English, Arabic and Russian pages. No Dirham
  symbol and no `درهم` in Phase 7.
- **Russian digit grouping — Confirmed 2026-09-30:** thousands grouped with a space
  (`209 999`, `48 000 км`), because a comma reads as a decimal separator in Russian.
- **Localized display values** (display only; the Sheet value is unchanged). Exact match after
  trimming; **any value not in this table is shown exactly as written in the Sheet** in every
  language. Source: `src/i18n/vehicle-values.ts`.

  | Column | Sheet value | English | Arabic | Russian |
  | - | - | - | - | - |
  | `Коробка` | `Автомат` | Automatic | أوتوماتيك | Автомат |
  | `Коробка` | `CVT` | CVT | CVT | Вариатор (CVT) |
  | `Топливо` | `Бензин` | Petrol | بنزين | Бензин |
  | `Привод` | `FWD` | FWD | دفع أمامي | Передний (FWD) |
  | `Региональная спецификация` | `GCC` | GCC | مواصفات خليجية | GCC |
  | `Региональная спецификация` | `American Specs` | American Specs | مواصفات أمريكية | Американская спецификация |
  | `Региональная спецификация` | `Korean Specs` | Korean Specs | مواصفات كورية | Корейская спецификация |
  | `Цвет` | `White` | White | أبيض | Белый |
  | `Цвет` | `Silver` | Silver | فضي | Серебристый |
  | `Цвет` | `Red` | Red | أحمر | Красный |
  | `Цвет` | `Black` | Black | أسود | Чёрный |
  | `Цвет` | `Orange` | Orange | برتقالي | Оранжевый |
  | Status `sold` (chip / VDP line) | `Продана` | Sold / This car has been sold. | مباعة / تم بيع هذه السيارة. | Продан / Этот автомобиль продан. |

  Colour rows: the current colour values of the live Sheet, confirmed 2026-09-30; any other
  colour is shown verbatim, never inferred or translated.
  `В наличии` has no visible label (available cars show a price, not a status chip). Status
  mapping itself is unchanged (fail closed). Adding a value: exact Sheet spelling + all three
  labels here and in the code, with tests.
- **WhatsApp prefills follow the page language**, with the same content and restrictions
  (title = public `year make model trim` verbatim, `Ref: <ID>`, the VDP URL in the page's
  language; no price, mileage or claims). The `Ref:` marker (**Confirmed 2026-09-30:** stays in
  English in EN / AR / RU messages, intentionally, for consistent Sales handling) and the
  attribution block labels (`Source:`, `Medium:`, …) stay identical in every language. English templates are unchanged (see "Contact and inquiries"). First-touch UTM
  behaviour is unchanged.

  | Intent | Arabic | Russian |
  | - | - | - |
  | Vehicle question | `مرحباً، أود الاستفسار عن [title] (Ref: [ID]).` | `Здравствуйте, меня интересует [title] (Ref: [ID]).` |
  | Viewing | `مرحباً، أود طلب معاينة [title] (Ref: [ID]).` | `Здравствуйте, хочу запросить осмотр автомобиля [title] (Ref: [ID]).` |
  | Test drive | `مرحباً، أود طلب تجربة قيادة [title] (Ref: [ID]).` | `Здравствуйте, хочу запросить тест-драйв автомобиля [title] (Ref: [ID]).` |
  | General request | `مرحباً، لم أجد السيارة التي أبحث عنها على الموقع. هل يمكنكم مساعدتي بمعرفة السيارات المتوفرة حالياً؟` | `Здравствуйте, мне не удалось найти на сайте нужный автомобиль. Подскажите, пожалуйста, что сейчас есть в наличии?` |

  Vehicle messages end with the VDP URL on its own line, as in English.
- **Interface copy:** Arabic and Russian translate the confirmed English wording
  (`src/i18n/messages.ts`), including "Request a viewing / test drive" (never booking wording)
  and the neutral general request. Native-speaker review is open question 19.

## Open questions

Ask the user; do not assume answers.

1. Is status alone the publish rule, or should a separate "publish on website" flag be added?
2. Wording when `Цена, AED` is empty (e.g. "Price on request")? VAT-inclusive? AED formatting?
3. Should `Состояние` be shown publicly, and with what allowed values/wording?
4. Is `Пробег, км` always public, or can it be withheld per car?
5. Is full VIN ever public? (Default: no.)
6. ~~Display labels for Russian source values~~ — resolved 2026-09-30 (Phase 7) for every
   current categorical value, including the current colours: see the dictionary in
   "Languages — Phase 7". A new Sheet value is shown verbatim until it is added there.
7. ~~WhatsApp business number~~ — confirmed 2026-09-30 (see "Contact and inquiries"). Still
   open: routing to several numbers, phone number, showroom address, opening hours.
8. ~~Viewing vs test drive~~ — confirmed 2026-09-30: separate intents, both WhatsApp prefills,
   no scheduling system in V1, no extra details collected on the site.
9. Should Sold VDPs stay online (for old ad links/SEO) and for how long? Indexable or `noindex`?
10. Which sold cars may be shown as social proof, and for how long after sale?
11. Revalidation window: how quickly must a Sheet status change appear on the site?
    (Accepted for V1 on 2026-09-30: ≤ 2 minutes — 60 s cache, 120 s hard max age.)
12. ~~Website photo publishing convention~~ — confirmed 2026-10-01 (see "Website photos"):
    dedicated `Website/` folder, `01.*` = cover, JPEG/PNG/WebP, videos off, human review before
    placing a file. Still open: (c) who is the named reviewer; plates — rule is "no readable
    plates", blur tooling not chosen; (d) video delivery; (e) HEIC conversion (convert before
    upload); (f) faster removal than ≈ 1 hour needs purge tooling.
13. ~~Language(s) for launch~~ — confirmed 2026-09-30: English (default), Arabic, Russian
    (see "Languages — Phase 7").
14. Brand assets: logo, brand colors, fonts — do they exist?
15. Domain and analytics/ad platforms in use (Meta, Google Ads, TikTok). Still open: Phase 5
    carries UTM parameters into WhatsApp messages only (no click IDs); no pixels or analytics until decided
    (with consent handling as required). No site domain is configured; VDP URLs in messages use
    the origin the visitor actually used.
16. Which of finance, trade-in, warranty, delivery, export are actually offered (for later phases)?
17. ~~"Didn't find what you need?" wording~~ — confirmed 2026-09-30 (see "Contact and
    inquiries"). Sourcing/import remains unconfirmed and is not promised.
18. Should a sold car's page or sold section show its last listed price? (Default until decided:
    no price on sold cars.)
19. Native-speaker review of the Arabic and Russian interface copy and WhatsApp templates
    (`src/i18n/messages.ts`, `src/conversion/inquiry-message.ts`) before any production launch.
20. ~~Currency in Arabic / Russian digit grouping~~ — confirmed 2026-09-30: `AED` everywhere,
    no Dirham symbol in Phase 7; Russian keeps space-grouped thousands.
21. ~~`Ref:` in Arabic/Russian messages~~ — confirmed 2026-09-30: stays `Ref:` in English in
    every language.
