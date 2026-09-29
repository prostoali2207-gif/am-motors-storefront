# Copy rules for vehicle content

Applies to page text, card text, SEO titles/meta, Open Graph, JSON-LD, ads and WhatsApp prefill.

## Allowed

- Templated facts from public fields: "2021 Toyota Land Cruiser GXR" (only parts that exist).
- Neutral calls to action: "Chat on WhatsApp", "Request a viewing", "Book a test drive".
- Approved states: "Sold", "Reserved", and the approved wording for missing price (open question).

## Blocked unless an approved Sheet field or business rule supports it

| Blocked phrase type | Examples |
| - | - |
| Condition/history claims | accident-free, no accidents, full service history, one owner, like new, mint |
| Price claims | best price, great deal, below market, discount, was/now, save AED X |
| Finance | from AED X/month, 0% down, easy finance, bank approval |
| Warranty/after-sales | warranty included, certified, inspected (N-point), free service |
| Logistics | free delivery, delivery across UAE, export available |
| Trade-in | we accept trade-ins, part exchange |
| Urgency/social proof | only 1 left, X people viewing, selling fast, 1000+ happy customers |
| Technical specs not in the Sheet | horsepower, 0–100 time, fuel economy from general knowledge |

## Structured data

- JSON-LD `Vehicle`/`Car` + `Offer` only with fields present in the public model.
- `availability` must derive from the mapped status; Sold → never `InStock`.
- No `priceValidUntil`, ratings or reviews unless real and approved.

## WhatsApp prefill

Template uses only: title, public ID, canonical URL. No price in the prefill unless the business
approves it (price may change between page view and message).
