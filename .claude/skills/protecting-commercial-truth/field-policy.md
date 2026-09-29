# Field policy

Defines how Sheet columns become public fields. The actual Sheet column names are **not yet
mapped**; Phase 2 reads the header row and fills the mapping table in the adapter and in
`docs/business-rules.md`. Until then, field names below are candidates, not facts about the Sheet.

## Contents
- Classification
- Candidate public fields
- Always-private categories
- Status mapping
- Media policy
- Adding a field

## Classification

Every Sheet column is exactly one of:

- **public** — may be rendered and sent to the client, after validation.
- **server-only** — used for logic (e.g. publish flag, Drive folder ID) but never serialized.
- **private** — never read into the public pipeline at all.

Default for any column not listed: **private**.

## Candidate public fields (to confirm against the Sheet)

| Public field | Type | Notes |
| - | - | - |
| `id` | string | Stable public identifier used in `/cars/[id]`; must not be an internal row number that shifts |
| `slug` | string | Optional, derived only from public fields |
| `status` | enum | Mapped from Sheet status; see below |
| `make`, `model`, `trim` | string | As written in Sheet; normalize whitespace only |
| `year` | integer | Validated range |
| `price` | { amount: number, currency: "AED" } \| null | Null → approved "on request" state or hidden, per business rule |
| `mileageKm` | integer \| null | Unit confirmed with business |
| `bodyType`, `transmission`, `fuelType`, `exteriorColor`, `interiorColor` | string \| null | Only if the Sheet has them |
| `regionalSpec` | string \| null | e.g. GCC spec — only if the Sheet states it |
| `description` | string \| null | Only if the Sheet has an approved public-description column |
| `media` | ordered list | From Drive pipeline (Phase 3) |

## Always-private categories

Never public, whatever the column is called: purchase/cost price, margins, supplier or seller
identity and contacts, customer/lead data, internal notes/comments, negotiation floor, payment
status, documents (Mulkiya, customs, invoices), full VIN/chassis number (unless the business
explicitly approves), internal staff names, Drive folder IDs/URLs, sync timestamps.

## Status mapping

Explicit table, maintained in code and in `docs/business-rules.md`:

| Sheet value | Public status | Listed in /cars | VDP |
| - | - | - | - |
| (to confirm) | `available` | yes | full |
| (to confirm) | `reserved` | business decision | enquiry only |
| (to confirm) | `sold` | no (separate sold section only) | sold state |
| anything else / empty | — | no | 404 |

Matching is exact after trimming and case-normalization; no fuzzy matching.

## Media policy

- Only files in the vehicle's linked Drive folder; order and cover image rules defined in Phase 3.
- Strip EXIF/GPS metadata from published images.
- Exclude files that show documents, plates (business decision), people or interior paperwork.
- No stock, AI-generated or other-vehicle images as fallbacks.

## Adding a field

1. Confirm the column exists and what it means with the business.
2. Classify it (public / server-only / private) and record it in `docs/business-rules.md`.
3. Add explicit mapping + validation in the adapter and a test for missing/invalid values.
4. Run the data-leak checks in `verifying-storefront`.
