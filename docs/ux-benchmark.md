# UX benchmark

Working document for automotive e-commerce and dealership benchmarking. The protocol lives in
`.claude/skills/designing-automotive-storefront/benchmark-protocol.md`.

**Status:** Phase 4A live visual benchmark recorded **2026-09-30** and accepted as the evidence
base. Typography sub-benchmark and the revised design direction "Coachwork" (end of this file)
are **pending review**. No Phase 4 code has been written.

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

## Typography sub-benchmark (2026-09-30)

Re-measured on the strongest references (rendered DOM, 390×844 and 1440×900). "Figures
tabular" = digits have equal width in the font as rendered (a `1111111` vs `0000000` width test in
the element's own font; if a web font had not loaded, the test measured its fallback, so treat
single "yes" values with care).

| Reference | Car title (mobile / desktop) | Case, tracking | Price | Figures tabular | Body |
| - | - | - | - | - | - |
| Girardo (sold VDP) | — / 40 px, weight 500, museo | Mixed case | a 20 px / 700 "Price: …" line was detected; its context on the sold page was not verified | No (museo) | 18/25, weight 300 |
| Tom Hartley Jnr (VDP) | 18 / 28 px, weight 700, Avenir | **Uppercase** | 16 / 22 px directly under title, centred | Yes* | 15/24 · 17/27 |
| Bring a Trailer (VDP) | 22 / 32 px, weight 700, Open Sans | Mixed case | 14 px / 700 in a meta line | Yes (Open Sans default) | 16/28 |
| The Elite Cars (list/VDP) | 16–18 / 24 px, weight 700–900, Montserrat | **Uppercase, +0.8 px** | not reliably measured (the match was a filter-slider label); visually smaller than the title on cards | No | 11 px |
| DubiCars (VDP) | 16 px / 500, Open Sans | Mixed case | **20 px / 600 above the title** | Yes (Open Sans default) | 14/25 |
| Kavak (VDP) | 16 px / 600, noka | Mixed case | monthly 16 px / 700 larger than price | Mixed | 14/20 |
| CARS24 (list) | 15–16 px / 600–700, Geist | **Uppercase** | not reliably measured (matches were budget-filter labels); visually bold, about title size, with EMI beneath | No (Geist) | 11–13 px |
| Alba (list) | 15.2 px / 600, Inter | Mixed case | 14 px | No (Inter default) | 14–16 |

\* Avenir may have been a fallback in the test.

Observed mechanics:
1. **No reference sets tabular figures explicitly** (`font-variant-numeric: normal` everywhere).
   Where figures align, it is the font's default (Open Sans, Roboto); Inter, Geist, Montserrat,
   Urbanist and museo have proportional digits, so price and km columns do not align.
2. **Editorial character comes from scale and weight contrast, not from the typeface alone:**
   Girardo = large medium-weight mixed-case title (40/500) + light body (300) + ruled lists;
   Hartley = title → colour line → price stacked on a centre axis; BaT = plain but generous
   reading measure (16/28, ~620 px column).
3. **All-caps titles cost lines:** Elite and Hartley uppercase titles wrap to two lines on
   names that fit one line in mixed case (e.g. "2023 MERCEDES BRABUS 900 XLP ADVENTURE" at
   16 px in a 274 px card). Tracked caps work well only as **small labels**.
4. **Price prominence splits two ways:** retail sites put price at or above title weight
   (DubiCars 20/600 over a 16/500 title); curated dealers keep price close to the title and
   slightly smaller (Hartley 22 under 28). Nobody we accept as a model leads with a monthly figure.
5. Mobile title sizes cluster at 16–22 px; desktop VDP titles at 28–40 px.

Candidate fonts checked from their OFL source files (fontTools):

| Family (OFL) | Axes | Default digits | `tnum` | Cyrillic | Verdict |
| - | - | - | - | - | - |
| **Archivo** | wght 100–900, **wdth 62–125** | proportional | **yes** | no | **Chosen** |
| Instrument Sans | wght 400–700, wdth 75–100 | proportional | yes | no | Close second; narrower range, less voice |
| Mona Sans | wght 200–900, wdth 75–125 | proportional | yes | no | Strong, but reads as GitHub's brand face |
| Schibsted Grotesk | wght 400–900 | proportional | yes | no | Tabular comma leaves gaps in prices (specimen: "209 , 999") |
| IBM Plex Sans | wght 100–700, wdth 75–100 | tabular | — | yes | Corporate/technical voice; previous pick withdrawn |
| Inter | wght, opsz | proportional | yes | yes | Generic product-UI voice (also Alba) |
| Roboto Flex | many incl. wdth 25–151 | tabular | — | yes | Generic platform voice |
| Onest, Golos Text, Geologica, Commissioner | wght only | — | mixed | yes | No width axis |

Specimens (390 px card, 1100 px titles) were rendered locally in the scratchpad and are not committed.

## Typography decision (proposed)

**Archivo (OFL 1.1), one variable family, self-hosted; the width axis is the typographic voice.**

- **Titles** (car model and trim, page titles): width 100, weight 600, tracking −1.5 to −2.5 %,
  **mixed case**, line-height 1.05–1.15. Large on VDP (editorial scale, mechanic 2).
- **Labels** (make · year eyebrow, spec labels, status chip, gallery counter): width 118–125,
  weight 600, **uppercase**, 11–12 px, tracking +0.12 em. This is where the "automotive" voice
  lives — tracked wide caps, as on badging and instrument faces — confined to small text (mechanic 3).
- **Figures** (price, km, year, counts, reference): `font-variant-numeric: tabular-nums
  lining-nums` set explicitly everywhere a number appears (mechanic 1), weight 600 for price.
- **Body**: width 100, weight 400, 16/26, measure ≤ 68 ch (BaT/Hartley reading comfort).
- Currency is written `AED 209,999` in text (the font has no dirham sign; no icon fonts).

Why Archivo: excellent Latin with a real grotesque character, a 62–125 width range that gives
titles and labels two distinct voices from one file (fewer bytes, one licence), `tnum` for
figures, and OFL licensing (no paid licence). Checked against the constraints:
- **Arabic later:** Archivo has no Arabic. If Arabic is confirmed (open q 13), an OFL Arabic
  family is benchmarked then and paired by weight and x-height through the font stack. Not
  chosen now, and the choice of Archivo does not depend on it.
- **Cyrillic:** Archivo has none. The UI is English; Sheet values in Russian (Коробка, Топливо,
  Привод…) must get English display labels (open q 6) before Phase 4 ships polished fact
  rows. Until then any verbatim Cyrillic value falls back to the system sans (truthful, visibly
  mixed). No candidate combined width axis + `tnum` + Cyrillic + editorial voice except
  Roboto Flex, which fails on voice.
- **Performance:** one variable WOFF2, Latin subset only, `font-display: swap` with metric
  fallback; axis ranges may be trimmed to what the scale uses. Measure in Phase 4.

## Proposed design direction — "Coachwork" (revised, pending review)

Replaces "Showroom ledger" (2026-09-30 first draft). Kept from it: inventory in the first mobile
viewport, no hero or promo, small-stock simplicity, price-first cards, mileage + regional spec +
transmission, ruled fact treatment, no marketplace clutter, no badges/urgency/EMI/promo, VDP as
the primary product page, no fake image placeholders.

### Revised visual direction

**Editorial automotive, restrained but authored.** Premium comes from proportion, rhythm and
type — large mixed-case titles, tight price/title pairing, tracked wide-caps labels, hairline
rules, generous vertical space — and later from photography placed in fixed, generous frames.
The information system of the first draft stays underneath (ruled facts, fixed fact order), but
the surface is a magazine page about cars, not a stock sheet: no table chrome, no zebra rows,
no boxed cards, no dashboard density.

- Neutral light palette; **no accent colour in Phase 4.** Final accent = **pending brand
  decision** (open q 14). WhatsApp green is not part of AM Motors' identity; WhatsApp styling
  is a Phase 5 matter.
- Interaction is expressed in ink: underlined links, ink focus ring; future action buttons
  (Phase 5) are specified as solid ink / outlined ink until a brand accent exists.
- Composition: left-aligned, strong left edge; title and price as one typographic unit;
  hairlines separate, whitespace groups; one large element per screen (title in state A,
  photo in state B).

### Mobile structure (390 px, 16 px gutters)

**Header (all pages), 56 px:** provisional text wordmark "AM Motors" (label style, wide caps)
left; "Cars" link right; hairline below. No other actions in Phase 4.

**Homepage `/`:**
1. Header (0–56).
2. Intro, padding 24 top / 20 bottom: H1 "Cars in stock" 32/34 title style; count line
   "12 cars available" 15 px muted, from data (singular handled). Ends ≈ y 166.
3. Available-car list, one column, cards separated by hairlines; **first card starts ≈ y 166;
   state A shows ~3 cars in the first viewport, state B shows the first car's photo, title and
   price.**
4. Reserved IA slot: general-request inquiry (Phase 5, q 17) — renders nothing in Phase 4.
5. Reserved IA slot: sold section (q 9/10/18) — renders nothing in Phase 4.
6. Footer: hairline, provisional wordmark. No address/hours until q 7.

**`/cars`:** same list and card; H1 "Cars in stock", count line; same reserved slot after the
list. Default sort newest listed. No filters.

**Card (state A — no approved photos), ≈ 180 px tall:**
1. Eyebrow (label style, muted): `BMW · 2021` (make · year).
2. Title: `840i M Sport Convertible` (model + trim) 22/26, width 100, weight 600; wraps, never
   truncated. The link's accessible name is the full `2021 BMW 840i M Sport Convertible`.
3. Price: `AED 209,999` 22/28, weight 600, tabular — directly under the title (price-first
   emphasis: largest figure on the card). No price line if the Sheet price is empty (q 2).
4. Fact line, 14/20: `48,000 km  ·  GCC  ·  Automatic` — only values that exist, in that order.
5. Whole card is one tap target (title link stretched over the card), ≥ 44 px; ink focus ring.

**Card (state B — approved photography, future):** a **3:2 frame** (358 × 239 px) goes above
the eyebrow, edge to the gutter, radius 0; the body below is identical. 3:2 is the native ratio
of most camera sensors, so approved photos crop least. Card ≈ 400 px.

**VDP `/cars/[id]` (state A):**
1. Header.
2. Back link "All cars" (14 px) — "See cars in stock" on sold cars.
3. Title block: eyebrow `BMW · 2021`; H1 model + trim 32/34; price 28/32 tabular. Sold:
   price replaced by a neutral **Sold** chip (label style, 1 px ink outline) + "This car has
   been sold." (existing truthful state).
4. Fact line (same as card).
5. "Photos unavailable" — one muted 14 px line (existing state). No image box.
6. Reserved action zone (Phase 5): full-width, stacked; specified below. Phase 4 renders nothing.
7. "Specification" (label-style heading): ruled rows, label left (muted) / value right (ink,
   tabular), min row 48 px, fixed order: Mileage, Regional spec, Transmission, Fuel, Engine,
   Drivetrain, Year, Colour, Reference (public ID). Empty values omitted — no "NA".
8. Footer.

**VDP (state B):** a **full-bleed 3:2 gallery (390 × 260 px)** is inserted between the back
link and the title block: horizontal swipe with snap, counter `1 / N` (label style) bottom
right, tap opens full-screen. H1 steps to 28/30. Title, price and the Phase 5 action zone still
fit in the first viewport (≈ 56 + 44 + 260 + ~150 = 510 px). Everything else is unchanged.

**Phase 5 geometry, reserved now (not built in Phase 4):**
- In-page action zone: primary 52 px full-width + two secondary 48 px (outlined) — labels
  "Request a viewing", "Request a test drive" plus the WhatsApp action; order decided in Phase 5.
- Sticky bar: appears when the in-page zone leaves the viewport; 64 px + safe-area inset,
  canvas background, top hairline, **max 2 actions** (48 px, 8 px gap); page gets matching
  bottom padding; never on sold cars.

### Desktop structure (1440 × 900)

Container max 1280 px, side margins ≥ 48 px, 12 columns, 24 px gaps.

- **Header 72 px:** wordmark left, "Cars" right, hairline.
- **Homepage / `/cars`:** intro row — H1 "Cars in stock" 56/56 across cols 1–8, count line
  baseline-aligned in cols 9–12; padding 48 top / 32 bottom. List: **3-column grid** (4 cols
  each ≈ 411 px), column gap 24, row gap 48. State A card: eyebrow, title 24/28, price 24/28,
  fact line (≈ 200 px) — first two rows visible above the fold. State B: 3:2 frame
  (411 × 274) above the same body.
- **VDP state A:** back link; **cols 1–7:** eyebrow, H1 56/58 (max ~2 lines), price 40/44
  tabular, fact line, "Photos unavailable" line; **cols 8–12:** "Specification" ruled list.
  Reserved Phase 5 action zone = top of cols 8–12, above the specification.
- **VDP state B:** **cols 1–8:** gallery — main 3:2 frame (≈ 836 × 557) + a row of 3:2
  thumbnails; **cols 9–12:** sticky panel (top 96 px): eyebrow, H1 36/40, price 32, fact
  line, [Phase 5 action zone], specification.
- The right column carries the same order in both states (identity → price → facts →
  actions → specification); only the left column switches between the typographic hero (A)
  and the gallery (B).
- Sold VDP: as above with the Sold chip in place of price, no action zone.

### No-photo vs future-photo behaviour

| Element | A: no approved photos (now) | B: approved photography (later) |
| - | - | - |
| Card | Typographic card, no media box | 3:2 frame on top, same body |
| Mixed stock (some cars without photos) | n/a | **Conditional (decide with q 12):** either enable listing photos only when every available car has approved photos, or show a same-size typographic plate (make/model in label style on the canvas, no car imagery). No empty boxes, no stock/AI images. |
| VDP mobile | Title block leads; "Photos unavailable" line | Full-bleed 3:2 gallery leads; H1 28 |
| VDP desktop | Large typographic hero left, specification right | Gallery left (cols 1–8), sticky panel right |
| Image framing | — | Fixed 3:2 everywhere (card, VDP main, thumbs); `object-fit: cover` for approved set photos; consistent-setup photography recommended to the business (synthesis 8) |

Listings keep making 0 Drive calls until listing media is explicitly approved; that is a
separate decision from this layout.

### Tokens — confirmed vs provisional

| Token | Value | Status |
| - | - | - |
| Figures | `tabular-nums lining-nums` on every number | Confirmed (rule + evidence) |
| Rules | 1 px hairlines; no card shadows; radius 0 (chips ≤ 2 px) | Confirmed for Phase 4 |
| Spacing | 4 px base; 8/12/16/20/24/32/48/64 scale | Confirmed for Phase 4 |
| Gutters / grid | 16 mobile, 24 tablet, 12-col 1280 max desktop, 24 gap | Confirmed for Phase 4 |
| Media geometry | 3:2 for cards, VDP main and thumbs | Confirmed for layout; revisit only if the photo convention (q 12) requires |
| Type roles | title / label / figure / body as above | Confirmed structure; sizes tunable in Phase 4 |
| Font | Archivo variable, OFL | **Provisional** — pending this review and brand assets (q 14) |
| `--canvas` | `#F6F5F1` | Provisional |
| `--ink` | `#161616` (16.6:1 on canvas) | Provisional |
| `--muted` | `#66645E` (5.4:1 on canvas) | Provisional |
| `--rule` | `#D9D6CE` (decorative) | Provisional |
| `--interactive` | = `--ink`; links underlined; focus ring 2 px ink, 2 px offset | Provisional neutral interaction token |
| Accent colour | — | **Pending brand decision (q 14)**; not WhatsApp green |
| Wordmark | Text "AM Motors" in label style | Provisional until brand assets (q 14) |
| Sold chip | Ink outline on canvas, label style | Confirmed neutral (never green/red) |

### Phase 4 now vs later

**Phase 4 implements (after this review):**
- Tokens and type roles above; Archivo self-hosted (Latin subset).
- Header/footer with the provisional wordmark and "Cars" link only.
- Homepage and `/cars`: intro + available list with **state A cards**; empty and
  data-unavailable states restyled with existing truthful copy.
- VDP state A **and** state B (the gallery component already exists for `getById` media;
  it gets the 3:2 geometry, counter and full-screen view; tested with synthetic fixtures;
  production media stays off).
- Existing sold VDP state restyled (Sold chip, no price, link to cars in stock); not-found/error pages.
- Accessibility (focus, headings, tap targets), no layout shift, performance check.

**Waits for Phase 5:** WhatsApp link and prefill, "Request a viewing", "Request a test drive"
actions and flows, the sticky action bar, the "Didn't find what you need?" block, attribution.
Phase 4 adds **no** live links, fake or disabled buttons, or inquiry flows.

**Waits for business decisions:** accent, wordmark, font confirmation (q 14); English labels for
Russian values (q 6 — needed before fact rows are polished); empty-price wording and VAT (q 2);
sold section / archive / sold VDP lifetime / sold price (q 9, 10, 18); listing photos and the
mixed-stock rule (q 12); Arabic (q 13); contact details (q 7); viewing vs test drive (q 8);
general-request wording (q 17). Card media (state B) is built only when listing media is approved.

### Explicitly excluded

Hero sliders, promo tiles, EMI figures, deal/urgency badges, review counts without a source,
ad creatives in galleries, first-visit modals, floating chat bubbles, all-caps titles,
black-and-gold, gradients, glassmorphism, placeholder or rendered car images, table/spreadsheet
styling, boxed shadow cards.

## Decisions log

| Date | Decision | Evidence | Notes |
| - | - | - | - |
| 2026-09-30 | Proposed "Showroom ledger" direction | Synthesis 1–10 | Superseded same day after review |
| 2026-09-30 | Review: benchmark accepted as evidence base; direction to be revised (neutral palette, no WhatsApp-green identity, typography evidence, photo-ready geometry, Phase 4/5 split, sold and "Didn't find" deferred, more editorial character) | User review | — |
| 2026-09-30 | Proposed "Coachwork" direction with Archivo typography | Typography sub-benchmark, synthesis 1–10 | **Pending user review**; not implemented |
