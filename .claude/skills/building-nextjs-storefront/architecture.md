# Architecture reference

Target structure for Phase 1 onward. Adjust names at setup if the current Next.js conventions
differ; keep the boundaries.

## Contents
- Directory layout
- Domain types
- Repository interface
- Adapters
- Caching and freshness
- Testing layout
- Environment variables

## Directory layout

```
src/
  app/
    layout.tsx
    page.tsx                 # "/" inventory-first home
    cars/
      page.tsx               # "/cars"
      [id]/
        page.tsx             # VDP
        not-found.tsx
    error.tsx
    not-found.tsx
  domain/
    vehicle.ts               # public Vehicle type + status enum (allowlist)
    inventory-result.ts      # ok | empty | unavailable
  inventory/
    repository.ts            # InventoryRepository interface
    index.ts                 # server-only factory selecting the configured adapter
  adapters/
    unavailable/             # Phase 1: always returns "unavailable" (production-safe default)
    google-sheets/           # Phase 2
    google-drive-media/      # Phase 3
  components/                # presentational, domain-typed
  lib/
    env.ts                   # validated server env
tests/
  fixtures/                  # synthetic vehicles only
  ...
```

## Domain types (shape, not final)

```ts
export type VehicleStatus = "available" | "reserved" | "sold";

export interface Vehicle {
  id: string;
  status: VehicleStatus;
  make: string;
  model: string;
  trim: string | null;
  year: number;
  price: { amount: number; currency: "AED" } | null;
  mileageKm: number | null;
  // further allowlisted fields added only via field-policy.md process
  media: VehicleMedia[];
}
```

## Repository interface

```ts
export type InventoryResult<T> =
  | { kind: "ok"; data: T }
  | { kind: "empty" }
  | { kind: "unavailable"; reason: "not-configured" | "source-error" | "invalid-data" };

export interface InventoryRepository {
  listAvailable(): Promise<InventoryResult<Vehicle[]>>;
  listSold(): Promise<InventoryResult<Vehicle[]>>;
  getById(id: string): Promise<InventoryResult<Vehicle> | { kind: "not-found" }>;
}
```

Pages switch exhaustively on `kind`. `unavailable` renders a truthful "inventory temporarily
unavailable" state with contact options — it is never rendered as "no cars".

## Adapters

- Phase 1 ships only the `unavailable` adapter in production code; tests inject an in-memory
  adapter built from synthetic fixtures.
- Google adapters authenticate with a service account (credentials in env), read only needed
  ranges, validate each row, map field-by-field to `Vehicle`, and drop invalid/non-public rows.
- Adapters never log full rows; log row identifiers and validation error codes only.

## Caching and freshness

- Define one revalidation window for inventory (agreed with the business) and tag cached reads
  (e.g. `inventory`) so on-demand revalidation can be added.
- On source error, prefer showing `unavailable` over serving data older than the window.
- VDP static params: optional; dynamic rendering is acceptable for small stock.

## Testing layout

- Unit: mapping, validation, status mapping, allowlist (unknown columns ignored), env parsing.
- Component/route: each `InventoryResult` kind renders the correct state.
- Guard test: production source does not import `tests/` and contains no fixture IDs.
- Browser/E2E (Phase 6): mobile viewport flows.

## Environment variables

Names are finalized in Phase 2. Rules: server-only, documented in `.env.example` without values,
validated in `lib/env.ts`, never prefixed `NEXT_PUBLIC_` for credentials or Sheet/Drive IDs.
