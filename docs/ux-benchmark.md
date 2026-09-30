# UX benchmark

Working document for automotive e-commerce and dealership benchmarking. The protocol lives in
`.claude/skills/designing-automotive-storefront/benchmark-protocol.md`.

**Status:** Phase 4A live visual benchmark recorded **2026-09-30**, plus one proposed design
direction (end of this file), **pending review**. No Phase 4 code has been written.

Rule for this file: **Observed** = seen in a screenshot or read from the rendered DOM during the
session below. **Inference** = our interpretation of what we saw. **Hypothesis** = not verified.
Competitor screenshots are working material only; they are not committed (protocol: never put
competitor screenshots in the repo).

## Method (2026-09-30)

- Tool: headless Chromium (Playwright 1.56) through the sandbox egress proxy, with normal TLS
  verification (the sandbox CA is trusted through the browser's NSS store; no certificate-ignore
  flags, no request re-routing, no bot-protection workarounds).
- Viewports: mobile **390×844** (touch, iPhone Safari UA) and desktop **1440×900**. For each page:
  first viewport plus 2–3 scrolled viewports; the rendered DOM was read for headings, visible
  CTA labels, computed type (family/size/weight) and fixed/sticky elements before and after
  scrolling.
- Visitor behaviour only: wait 6–15 s, scroll through once so lazy content loads, and close
  consent/newsletter overlays with their own buttons. No logins, no form submissions.
- One vehicle per site (VDP picked from the site's own listing). First-visit state.

Limitations (read before using the findings):
- The egress IP geolocates to the **US**: DubiCars showed "Ship to United States" and **USD**
  prices. A UAE visitor would see AED. Currency on DubiCars is therefore not evidence.
- Timing is a snapshot: some pages still showed skeletons/blurred placeholders at 7–8 s and were
  re-captured with longer waits. "Still loading at N s" is recorded as observed, not as a
  performance measurement.
- Headless Chromium did not render some hero videos (Girardo home stayed blank). Nothing is
  concluded from that.
- Nothing here measures conversion. Where a pattern is common, that is prevalence, not proof it
  works.

## Access status

| Reference | Result | Used as evidence |
| - | - | - |
| DubiCars (UAE marketplace) | Accessible | Yes |
| **Dubizzle Motors** (UAE classifieds) | **Inaccessible due to site bot protection** (Imperva hCaptcha "Additional security check") | No |
| CARS24 UAE (online retailer) | Accessible | Yes |
| CarSwitch (UAE platform) | Accessible | Yes |
| The Elite Cars (UAE single dealer, luxury) | Accessible | Yes |
| Alba Cars (UAE single dealer) — added | Accessible | Yes |
| Kavak UAE (online retailer) — added | Accessible | Yes |
| Al-Futtaim Automall (UAE retailer) — added | Accessible | Yes |
| Girardo & Co (UK specialist dealer, sold archive) — added | Accessible | Yes |
| Tom Hartley Jnr (UK specialist dealer, sold archive) — added | Accessible | Yes |
| Bring a Trailer (US auction marketplace, results archive) — added | Accessible | Yes |
| **CarMax** | **Inaccessible due to site bot protection** (Akamai "Access Denied") | No |
| **Carvana** | **Inaccessible due to site bot protection** (Cloudflare challenge) | No |
| **Auto Trader UK** | **Inaccessible due to site bot protection** (Cloudflare challenge) | No |
| **Canepa** | **Inaccessible due to site bot protection** (Cloudflare challenge) | No |
| **Porsche Finder** | **Inaccessible due to site bot protection** (Vercel Security Checkpoint, 429) | No |
| **Collecting Cars**, **Cars & Bids** — candidates | **Inaccessible due to site bot protection** (Cloudflare) | No |
| Hexagon Classics — candidate | Homepage only; stock pages returned 403 | No (homepage not needed) |

Anything this file says about the inaccessible sites is not evidence.

## Pages observed (source URLs, 2026-09-30)

| Site | Homepage | Listing | VDP | Sold / ended |
| - | - | - | - | - |
| DubiCars | `dubicars.com/` | `/uae/used` | `/2020-land-rover-range-rover-1027745.html` | — (not public) |
| CARS24 UAE | `cars24.ae/` | `/buy-used-cars-dubai/` | `/buy-used-toyota-rav4-2022-cars-dubai-9714842275/` | — |
| CarSwitch | `carswitch.com/uae` | `/uae/used-cars/search` | `/dubai/used-car/audi/q5/2018/877523` | — |
| The Elite Cars | `theelitecars.com/` | `/car-listing` | `/product/2025-ferrari-purosangue` | — (no public sold view found) |
| Alba Cars | `albacars.ae/` | `/buy-used-cars-uae` | `/buy-used-cars/vehicle/1720-land-rover-range-rover-hse` | — |
| Kavak UAE | `kavak.com/ae` | `/ae/preowned` | `/ae/cars-for-sale/toyota-rav4-25_vxr_hybrid_4wd_e_cvt-suv-2024` | — |
| Automall | `automall.ae/en/` | `/en/used-cars-shop/` | `/en/used-cars-shop/details/KMHS281K9PU473637/` | "Show available cars only" toggle (listing) |
| Girardo & Co | `girardo.com/` | `/available/` | — (available VDP not captured) | `/sold/` + sold VDP `/car/2009-alfa-romeo-8c-spider/` |
| Tom Hartley Jnr | `tomhartleyjnr.com/` | `/current-stock/` | `/car/stock/1989/porsche/911-turbo-930/…` | `/previously-sold/` + sold VDP `/car/previously-sold/2018/porsche/911-gt2-rs-991/…` |
| Bring a Trailer | `bringatrailer.com/` | `/auctions/` | `/listing/2023-porsche-911-dakar-22/` | `/auctions/results/` + ended VDP `/listing/1977-porsche-930-turbo-20/` |

All pages at 390×844 and 1440×900.

## Observations by reference

### DubiCars — UAE marketplace
- **Home (m+d, observed):** app-install banner, then search ("Search 25,357 cars") and featured
  dealers. **No car visible in the first mobile viewport.** Open Sans throughout, H1 20 px/600.
- **Listing (observed):** mobile = full-width card list; sticky search/filter chips and a sticky
  results/sort bar after scroll. Card: photo with "1 / 19" counter and dots, price first
  (18 px/600), title "Make • Model • Trim", fact line with icons: **city · regional spec
  ("Japanese") · year · km**, dealer logo, then **Call + WhatsApp buttons on the card**. Promo
  badges "Highly Responsive" / "Premium". Desktop = horizontal row cards (image left, facts right)
  + a filter bar with 6 dropdowns incl. "Regional specs".
- **VDP (observed):** mobile: gallery → "Verified Seller" → price → title → fact chips
  (**year · km · GCC**) → "Overview" 2-col icon grid (fuel, body, engine, hp, seats, drive,
  transmission, cylinders, colour, doors, interior colour) → seller description.
  **Fixed bottom bar, ~115 px: "Highly Responsive" line + Call / Email / WhatsApp**, WhatsApp green.
  After scrolling, a fixed top bar appears with title + price (+ CTAs on desktop). Desktop:
  gallery left, right panel with price → dealer → WhatsApp (full-width green) → Call / Email.
- **Weak / do not transfer (observed):** app banner and marketplace chrome before any car;
  engagement badges; dense nav. Inference: fine for 25k cars, noise for a small stock.

### CARS24 UAE — online retailer
- **Home (observed):** mobile first viewport = category tiles + search + saturated purple promo
  ("30 day return guarantee"), then brand logos; **2 car cards peek at the bottom** (price + EMI).
  Geist Sans; desktop H1 48 px/600 in a purple promo hero.
- **Listing (observed):** mobile = horizontal cards (image left): title uppercase
  "2023 NISSAN ALTIMA", trim line, chips **"65k km · GCC · Flood free"**, price AED, then
  **EMI "/mo for 5 yrs, 0 downpay"** of similar weight; ribbons "1.99% interest" / "Coming Soon";
  floating WhatsApp bubble overlapping cards; bottom tab bar. Desktop: sticky left filter
  sidebar (incl. Monthly EMI, Down payment) + 3-col grid, cut-out product shots on a gradient.
- **VDP (observed):** desktop: gallery left + thumbnails; right sticky panel: title, trim ·
  km · **GCC Specs**, price + "+AED 3,500 Convenience fee" + EMI, "Book Free Test Drive"
  (primary) / "Buy Online". **Mobile: sticky 2-button bar "Buy Online | Book Free Test Drive";
  at 8 s the mobile VDP still showed broken images and a spinner.**
- **Weak / do not transfer:** "Book" wording (not allowed for us), EMI-led pricing, promo
  ribbons, client-side-rendered VDP that is empty on first paint (observed at 8 s).

### CarSwitch — UAE platform
- **Home (observed):** gradient-blue hero with lime CTA "Browse trusted cars", 3D red cars in
  front of a Burj Khalifa illustration, trust tiles (4.8 on Google, 200-point inspection…).
  No stock car in first mobile viewport.
- **Listing (observed):** single-column mobile cards: photo (FEATURED tag, video icon), "Pay
  monthly" payment logos strip, title "Audi Q5 45 TFSI Quattro 2.0L I4", fact line
  **year · km · GCC specs**, chips "Safe Switch", **"9% off"**, then PRICE and INSTALLMENTS side
  by side with struck-through old price. Desktop: sticky left sort/filter (incl. "AI mode").
  One desktop card showed "90% off" on 11,500 vs 111,500 AED (observed; inference: data error
  made loud by a computed discount badge).
- **VDP (observed):** mobile: gallery (counter "20", Video) → "What's included" band → chips
  (GCC specs, Fully Loaded, First owner: Yes, Service history: Yes) → title → year · km · ID ·
  location → chips "Price dropped / Good price / Negotiable" → price. **Sticky single full-width
  "I'm interested" button.** Desktop: right panel repeats the car mini-card + "I'm interested".
- **Weak / do not transfer:** computed discount / "Good price" labels, AI-mode search, heavy
  gradients and illustration hero (all blocked by our rules).

### The Elite Cars — UAE luxury single dealer
- **Home (observed):** near-black UI (#080808), Montserrat, auto-rotating promo hero
  ("AED 4000/month", "Price from") with a make/model search under it; "Featured cars of the
  week" as a one-card carousel with "EXPLORE". No stock in first mobile viewport.
- **Listing (observed):** "PRE-OWNED CARS FOR SALE"; **all cars shot in the same white studio
  cove with the same framing** (cars read as one set); card = photo, uppercase title,
  price "AED 13,000,000 (inc. VAT)", 3 label/value rows (Engine, Model Year, Interior).
  Desktop: left filter sidebar + 3-col grid. **At 7 s both viewports were still skeletons**;
  loaded on a longer wait.
- **VDP (observed):** desktop: large photo + 4 thumbs (+17) left, right: uppercase title,
  share/WhatsApp icons, **Specifications / Standard features as collapsed accordions**,
  Exterior/Interior, "VALUE: AED 2,099,000", "ENQUIRE NOW", "FINANCE CALCULATOR". **The vehicle
  gallery contains a marketing slide ("Why choose The Elite Cars")** among the car photos.
  Floating WhatsApp bubble. Mobile gallery still black at 8 s.
- **Weak / do not transfer:** black-and-white "luxury" styling (blocked style), all-caps long
  titles, facts hidden in accordions, ad creative inside the car gallery (directly relevant to
  our Drive folders mixing photos and ad creatives).
- **Transferable mechanic:** one consistent photo setup for every car → the grid looks curated.

### Alba Cars — UAE single dealer
- **Home (observed):** rounded blue-grey hero, "Find Your Perfect Used Car in Dubai",
  red "Show All Cars", Google "4.8 / Reviews (1,230+)" badge (desktop badge said 2,500+),
  a rendered silver sedan; promos (bank approval, "120-day loan deferment"); team section with
  salespeople. No stock in first mobile viewport.
- **Listing (observed):** "Browse all 348 used cars in Dubai"; Filters + Sort By; card = photo
  (blurred placeholder at 7 s), title, year right-aligned, **"Starts from AED 4,113/month" in red
  before "Full Price AED 209,999"**, Odometer. Mobile filter is a full-screen sheet with sticky
  "Reset All / Show".
- **VDP (observed):** title → gallery → price "(Inclusive of VAT)" → EMI → Stock no. →
  **"15 People are viewing right now" (mobile) / "11 People…" (desktop, same minute)** →
  "Book a free test drive" (primary) / "Call Us" / "Buy this Car" → "0% downpayment / 1 year free
  warranty" → overview tiles incl. **"Service Contract: NA"**. Desktop right sticky panel.
- **Weak / do not transfer:** urgency counter (inference: two different numbers in the same
  minute suggest it is not a reliable live metric), finance/warranty promos, "NA" filler for
  missing data, "Book" wording.

### Kavak UAE — online retailer
- **Listing (observed):** every car on the same **grey studio turntable** (consistent set);
  card: "Nissan • Patrol", "year · km · engine/trim…", **"Monthly payments from" as the largest
  number**, struck-through price; badges "Hot Deals", "Unbeatable price".
- **VDP (observed):** gallery "1 / 29" → title → km · country → "Price from AED 117,999",
  monthly, "Does not include AED 4,000 convenience fee" → **fixed bottom "Visit Car or Book Now"**
  + floating WhatsApp.
- **Transferable:** consistent photo set; fee disclosure next to price. **Do not transfer:**
  monthly-first pricing, deal badges, "Book".

### Al-Futtaim Automall — UAE retailer
- **Listing (observed):** left filter column with a **"Show available cars only" toggle**
  (inference: reserved/sold cars appear in the list when off); 3-col cards "Monthly payment
  from" + price, "View details" / **"Reserve"**; a **promo tile ("September Offer") inserted
  into the vehicle grid**.
- **VDP (observed):** make and model on two lines, "Monthly payment from AED 1,488" above
  "AED 94,995", Reference no., **"Request Test drive" / "Reserve now"**, "AED 500 to reserve —
  fully refundable"; finance panel. Mobile: **fixed reserve bar (~92 px) stacked on a sticky
  bottom tab bar (~81 px)** ≈ 170 px of the 844 px viewport.
- **Transferable:** the label "Request Test drive" (matches our confirmed wording).
  **Do not transfer:** online reservation (out of scope), promo tiles in the grid, stacked
  sticky bars.

### Girardo & Co — specialist dealer
- **Available listing (observed, desktop):** editorial mosaic — one large photo + 2 smaller
  per car, then the car name in a light 24 px title; no price or facts on the listing.
  Intro copy: "Can't find what you're looking for? CONTACT US — … we can source specific cars".
  Mobile listing was still loading at 15 s.
- **Sold archive (observed):** `/sold/` page: intro, "Recently Sold" section, 4-up photo cards
  with a red **"RECENTLY SOLD"** tag on the image and the title under it; **no prices**.
- **Sold VDP (observed):** page stays online; header "Sold" + "◂ SOLD CARS" back link,
  full-bleed hero with "RECENTLY SOLD" tag, title, **key points as a hairline-ruled list**
  ("Single owner and 3,715 kilometres from new", …), side block "SOLD / Chassis no. / Engine
  no. / Registration", long editorial text, 2-col photo grid. No price, no enquiry button seen.
  The mobile sold VDP showed a fallback serif and the fixed nav overlapping text (weak).
- **Transferable:** sold as a separate archive; sold VDP kept with an unmistakable label and a
  way back; hairline-ruled fact list; "can't find it → contact" at the top of stock.
  **Do not transfer:** chassis/engine numbers in public (our VIN is private), newsletter modal
  on first mobile visit, auto-playing video hero.

### Tom Hartley Jnr — specialist dealer
- **Home/Listing (observed):** newsletter modal on first visit (closed with its "X"). Listing:
  "Current Stock" photo header, one "Filter By Make" dropdown (the only filter), cards = large
  photo, "2015 FERRARI LAFERRARI", one sentence, "£POA". **Every car photographed in the same
  location/angle** (dealership forecourt).
- **VDP (observed):** full-bleed photo carousel; centred title, colour line, price ("£325,000");
  tabs Description / Specification; "Enquire". Desktop: title and price over the hero photo.
- **Previously sold (observed):** separate `/previously-sold/` archive, same card grid with
  title + "Chassis No." (no price). **Sold VDP: identical layout, the price replaced by a
  black "SOLD" chip**, back link "< Previously sold"; "Enquire" still present in the DOM.
- **Transferable:** one filter at most for small stock; sold state = same page, price swapped for
  a neutral chip; consistent photo set. **Do not transfer:** POA pricing (unconfirmed for us),
  first-visit modal, public chassis numbers.

### Bring a Trailer — auction marketplace
- **Home (observed):** the **first mobile viewport shows an actual car** (featured listing
  photo, title, "Bid: USD $15,000 | 6 days") right under header + search — the only reference
  with real inventory in the first mobile viewport. Open Sans, text-heavy, restrained red only
  for links/time.
- **VDP (observed):** title (22/32 px bold) → location + tier chips → price line → watch /
  place bid → large photo → fact chips (Make, Model, Era, Origin, Location) → editorial text +
  "BaT Essentials" list. After scrolling, a **compact fixed top bar with title, price and the
  primary action** (136 px mobile, 95 px desktop). No bottom bar.
- **Ended/not-sold VDP (observed):** page kept; banner at top "This Porsche 930 Turbo got away,
  but there are more like it here" linking to similar cars; "Bid to USD $240,000" + date.
- **Transferable:** inventory in the first viewport; a "no longer available → see similar"
  banner on ended pages; plain, dense, legible typography. **Do not transfer:** auction
  mechanics, comments, watcher counts.

## Cross-reference synthesis

Each point lists the references it rests on. "Inference" marks our interpretation.

1. **First mobile viewport.** Only BaT showed real inventory above the fold; CARS24 showed two
   cards at the bottom edge. DubiCars, CarSwitch, Elite, Alba, Kavak, Girardo, Hartley all led
   with search, promo or hero. Inference: an inventory-first homepage is a real point of
   difference in the UAE set, not a copy of it.
2. **Card facts in the UAE.** km + **regional spec (GCC)** + year appear on DubiCars, CARS24 and
   CarSwitch cards; Elite uses engine / year / interior; Alba shows odometer. Price is the
   largest number on DubiCars/Elite; EMI rivals or beats it on CARS24/Alba/Kavak/Automall.
3. **WhatsApp.** Present on DubiCars (card + VDP bar), Elite, Alba, Kavak, CARS24 (floating
   bubbles). Retailers with their own flows lead with a form CTA instead (CarSwitch "I'm
   interested", CARS24 "Book Free Test Drive", Automall "Request Test drive / Reserve now").
4. **Mobile sticky actions.** Bottom bar: DubiCars (3 actions, ~115 px), CARS24 (2), CarSwitch
   (1), Kavak (1), Automall (2 + tab bar ≈ 170 px). Top bar after scroll: BaT, DubiCars.
   Specialist dealers (Girardo, Hartley, Elite) had none. Inference: 1–2 actions is the norm;
   3 actions or stacked bars eat the viewport.
5. **Desktop VDP.** Gallery left + right panel with title/price/CTAs: DubiCars, CARS24,
   CarSwitch, Elite, Alba, Automall. Single centred column: BaT, Hartley, Girardo.
6. **Filters for small stock.** Hartley: one "Filter by make". Girardo: none. Large stocks:
   sidebars (CARS24, CarSwitch, Alba, Elite, Automall). Supports "no filter system" for us.
7. **Sold.** Separate archives: Girardo `/sold/`, Hartley `/previously-sold/`, BaT results.
   Sold VDPs stay online with a label (Girardo "Sold / Recently sold", Hartley "SOLD" chip in
   place of price, BaT "got away… more like it here"). No reference showed a sold price.
   No UAE reference exposed a public sold view that we found.
8. **Photography.** The most "premium"-looking grids are the ones with one consistent photo
   setup per car (Elite studio cove, Kavak turntable, Hartley forecourt, Girardo shoots) —
   not the ones with the most UI styling. Inference.
9. **Typography.** Neutral sans throughout (Open Sans, Geist, Plus Jakarta, Urbanist, Inter,
   Montserrat, Avenir, Museo). Title sizes 16–22 px mobile / 20–32 px desktop. All-caps titles
   (CARS24, Elite, Hartley) wrap to 2 lines on long model names (observed on Elite/Hartley).
10. **Loading.** Client-rendered listings/VDPs were empty or skeletal at 7–8 s (Elite, CARS24
    mobile VDP, CarSwitch images, Alba placeholders). Inference: server-rendered first paint is
    a practical advantage, especially on ad traffic.

### Weak or generic patterns observed — do not transfer

| Pattern | Seen on |
| - | - |
| Urgency counter "N people viewing right now" | Alba |
| Computed deal labels ("9% off", "Good price", "Hot Deals", "Unbeatable price", "Price dropped") | CarSwitch, Kavak |
| EMI / monthly payment as the lead number | CARS24, Alba, Kavak, Automall |
| Promo creative inside the vehicle gallery or grid | Elite (gallery slide), Automall ("September Offer" tile) |
| "Book …" / "Reserve now" CTAs | CARS24, Alba, Kavak, Automall |
| "NA" shown for missing values | Alba |
| Black-and-white "luxury" UI, all-caps titles | Elite |
| Gradient / illustration heroes, rendered cars | CarSwitch, Alba, CARS24 |
| First-visit newsletter / app modals over content | Hartley, Girardo, DubiCars (app banner) |
| Floating chat bubble covering listing content | CARS24, Alba |
| Stacked sticky bars (~170 px) | Automall |
| Unverifiable review counts (badge numbers differ by viewport) | Alba |

## Hypotheses — status after 2026-09-30

- **H1 WhatsApp primary in the UAE** — *pattern observed* (DubiCars, Elite, Alba, Kavak, CARS24).
  Effect on inquiries not measurable here.
- **H2 sticky mobile CTA** — *pattern observed* on 5 references (see synthesis 4); the uplift
  claim remains a hypothesis.
- **H3 simple list for small stock** — *supported by pattern*: small-stock dealers use no filter
  or one dropdown (Girardo, Hartley).
- **H4 sold in a separate archive** — *observed* (Girardo, Hartley, BaT).
- **H5 regional spec is a key card fact** — *observed* on DubiCars, CARS24, CarSwitch cards and
  the Alba VDP.

## Findings log

| Date | Site | Page | Viewport | Mechanic | Status |
| - | - | - | - | - | - |
| 2026-09-30 | BaT | Home | m | Real car in first mobile viewport | Observed |
| 2026-09-30 | DubiCars, CarSwitch, Elite, Alba, Kavak, Girardo, Hartley | Home | m | No stock in first mobile viewport | Observed |
| 2026-09-30 | DubiCars, CARS24, CarSwitch | Listing | m+d | km + GCC/regional spec + year on card | Observed |
| 2026-09-30 | DubiCars | Listing / VDP | m | Call + WhatsApp on card; fixed 3-action bottom bar on VDP | Observed |
| 2026-09-30 | CarSwitch, Kavak | VDP | m | Single full-width sticky CTA | Observed |
| 2026-09-30 | CARS24, Automall | VDP | m | 2-action sticky bar; Automall stacked with tab bar | Observed |
| 2026-09-30 | BaT, DubiCars | VDP | m+d | Compact fixed top bar (title + price + action) after scroll | Observed |
| 2026-09-30 | 6 refs | VDP | d | Gallery left + right sticky panel | Observed |
| 2026-09-30 | Hartley, Girardo | Listing | m+d | 0–1 filters for small curated stock | Observed |
| 2026-09-30 | Girardo, Hartley, BaT | Sold | m+d | Separate archive; sold VDP kept with label, no price | Observed |
| 2026-09-30 | Hartley | Sold VDP | m+d | Price replaced by neutral "SOLD" chip, same layout | Observed |
| 2026-09-30 | BaT | Ended VDP | m | "Got away — more like it here" banner | Observed |
| 2026-09-30 | Elite, Kavak, Hartley | Listing | m+d | Consistent photo setup across all cars | Observed |
| 2026-09-30 | Elite | VDP | d | Marketing slide inside the vehicle gallery | Observed |
| 2026-09-30 | Alba | VDP | m+d | "N people viewing" counter, different N per viewport | Observed |
| 2026-09-30 | Alba | VDP | m+d | "NA" shown for missing value | Observed |
| 2026-09-30 | Elite, CARS24, CarSwitch, Alba | Listing / VDP | m | Skeleton / empty images at 7–8 s | Observed |
| 2026-09-30 | Dubizzle, CarMax, Carvana, Auto Trader UK, Canepa, Porsche Finder, Collecting Cars, Cars & Bids | — | — | Inaccessible due to site bot protection | Not evidence |

## Proposed design direction — "Showroom ledger" (pending review)

One direction. Nothing here is implemented; it is the brief for Phase 4 once approved.

### Idea

A calm, light, **text-first catalogue** that reads like a well-kept stock sheet: every car is a
clear row of true facts, and the page never needs photos to look finished. When website photos
exist, they slot into the same structure; they add to it, but the layout does not depend on
them. This fits our real state (no website photos, listings make 0 Drive calls, VDPs show
"Photos unavailable") and avoids every generic pattern in the table above.

Why this and not a photo-led "luxury" direction: the photo-led references (Elite, Girardo,
Hartley) look premium because of **consistent professional photography** (synthesis 8), which we
do not have; a dark or image-driven layout with empty image slots looks broken (Elite skeletons,
observed). A ledger looks intentional with or without photos.

### Visual system

- **Canvas:** warm off-white page, white surfaces, near-black ink, one mid-grey for secondary
  text, hairline dividers. Light mode only in V1. (Tokens proposed: `--canvas #F7F6F2`,
  `--surface #FFFFFF`, `--ink #141414`, `--muted #5E5E5A`, `--rule #E2E0DA`.)
- **One accent, for actions only:** a deep green (`--action #0E7A3E`, white text ≈ 5.4:1; muted on canvas ≈ 6.0:1)
  used for the WhatsApp action and nothing decorative. Chosen because WhatsApp is the primary
  inquiry path (H1) and green reads as "message" in the UAE set; secondary actions are outlined
  ink. The **Sold** chip is neutral ink/grey, never green or red.
- **Type:** one neutral grotesk with **tabular figures** and a matching Arabic family for later
  RTL readiness — proposal **IBM Plex Sans** (+ IBM Plex Sans Arabic if Arabic is confirmed,
  open question 13), self-hosted. Sentence/title case, **no all-caps titles** (synthesis 9).
  Mobile scale: car title 20/26 semibold, price 22 semibold tabular, facts 14/20, body 16/24.
  Desktop: title 28, price 28.
- **Grid & spacing:** 8 px base, 16 px mobile gutter, max content width ~1200 px; hairline rules
  instead of card shadows; radius 4 px or less.
- **Numbers:** `AED 209,999`, `48,000 km`, year — always tabular, never abbreviated ("48k").

### Homepage (inventory-first)

1. Compact header (≈56 px): wordmark + WhatsApp icon link. No hero, no slider, no search bar.
2. One line of context + real count: "Cars in stock · N available" (N from data).
3. The available-car list starts inside the first mobile viewport (synthesis 1).
4. "Didn't find what you need?" → WhatsApp block after the list (no sourcing promise, open q 17).
5. "Recently sold" as a separate, labelled section below (only if open questions 9/10 allow).

### Listing `/cars` and card anatomy

- Mobile: single-column list; each row is one full-width tap target. Desktop: 2-column grid.
- Row/card order: **title** (`2021 BMW 840i M Sport` from year/make/model/trim) → **price**
  (largest number; wording for empty price pending open q 2) → **fact line**
  `48,000 km · GCC · Automatic` (only values that exist; regional spec is included per H5).
- **No media slot in V1** (listings never have media). When photos are approved, a fixed-ratio
  image (4:3) goes above the title; the rest is unchanged.
- No badges except **Sold** (and only in the sold section). No filters; a single make filter only
  if stock grows (Hartley pattern). Default sort: newest listed.
- Empty / unavailable states use the same ledger styling with a WhatsApp route.

### VDP `/cars/[id]`

- **Mobile order:** back to all cars → title → price → key facts as a 2-column
  label/value grid with hairlines (Girardo-style ruled list) → CTA block (WhatsApp primary;
  "Request a viewing" and "Request a test drive" secondary, outlined) → full specs (remaining
  public fields only; missing rows omitted, never "NA") → dealer contact (once confirmed, open q 7).
- **Photos:** if media exists → gallery first (4:3, counter "1 / N", full-screen). If not → a
  slim neutral "Photos unavailable" line under the title, **not** an empty image box.
- **Sticky mobile bar:** appears after the in-page CTA block scrolls away; max 2 actions
  (WhatsApp + one secondary, which one depends on open q 8); ≈64 px + safe-area; never on
  sold cars (synthesis 4).
- **Desktop:** content column left, right sticky panel with title, price, facts summary and CTAs
  (synthesis 5).

### Sold state

- Same VDP layout; price is replaced by a neutral **"Sold"** chip (Hartley pattern, and the
  current default of no price on sold cars, open q 18); no viewing/test-drive actions; a top
  line "This car has been sold — see cars in stock" linking to `/cars` (BaT pattern).
- Sold cars appear only in a separate "Recently sold" section/archive (Girardo, Hartley),
  never mixed into available stock. Whether sold VDPs stay online and indexable is open q 9.

### Explicitly excluded

Hero sliders, promo tiles, EMI figures, deal/urgency badges, review counts without a source,
ad creatives in galleries, first-visit modals, floating chat bubbles over content, all-caps
titles, black-and-gold or gradient styling, placeholder or rendered car images.

### Open questions this direction depends on

2 (price-empty wording, VAT), 6 (English labels for Russian values), 7 (contact, address),
8 (viewing vs test drive — decides the sticky secondary action), 9/10/18 (sold pages, sold
section, sold price), 13 (Arabic), 14 (brand assets — the wordmark and whether the green
accent conflicts with any existing brand colour), 17 ("Didn't find" wording).

## Decisions log

| Date | Decision | Evidence | Notes |
| - | - | - | - |
| 2026-09-30 | Proposed: "Showroom ledger" direction (above) | Synthesis 1–10, weak-pattern table | **Pending user review**; not implemented |
