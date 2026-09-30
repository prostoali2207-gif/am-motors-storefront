# Copy rules for vehicle content

Applies to page text, card text, SEO titles/meta, Open Graph, JSON-LD, ads and WhatsApp prefill.

## Allowed

- Templated facts from public fields: year + make + model + trim (only parts that exist).
- Neutral calls to action: "Chat on WhatsApp", "Request a viewing", "Request a test drive",
  "Didn't find what you need?" (general request via WhatsApp).
- Approved states: "Sold", and the approved wording for missing price (open question).
  No "Reserved" — not a confirmed status.

## Blocked unless an approved Sheet field or business rule supports it

| Blocked phrase type | Examples |
| - | - |
| Condition/history claims | accident-free, no accidents, full service history, one owner, like new, mint |
| Price claims | best price, great deal, below market, discount, was/now, save AED X |
| Finance | from AED X/month, 0% down, easy finance, bank approval |
| Warranty/after-sales | warranty included, certified, inspected (N-point), free service |
| Logistics | free delivery, delivery across UAE, export available |
| Confirmed-appointment wording | Book a test drive, booking confirmed, reserve your slot (until a scheduling system is confirmed) |
| Sourcing promises | we'll find any car, we import to order (general-request path must stay neutral) |
| Placeholder promises | photos coming soon, more photos soon |
| Trade-in | we accept trade-ins, part exchange |
| Urgency/social proof | only 1 left, X people viewing, selling fast, 1000+ happy customers |
| Specs not in the Sheet | body type, interior color, options, horsepower, 0–100 time, fuel economy from general knowledge |

## Structured data

- JSON-LD `Vehicle`/`Car` + `Offer` only with fields present in the public model.
- `availability` must derive from the mapped status; Sold → never `InStock`.
- No `priceValidUntil`, ratings or reviews unless real and approved.

## WhatsApp prefill

Template uses only: title, public ID, the VDP URL. No price in the prefill unless the business
approves it (price may change between page view and message). The confirmed templates (vehicle
question, viewing, test drive, general request) live in `docs/business-rules.md` → "Contact and
inquiries"; an optional attribution block may follow, holding only received UTM values
(no ad click IDs).
