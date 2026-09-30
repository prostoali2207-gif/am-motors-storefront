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
    queries.ts               # request-time reads (connection + cache), errors → unavailable
  adapters/
    unavailable/             # Phase 1: always returns "unavailable" (production-safe default)
    google-sheets/           # Phase 2
    google-drive-media/      # Phase 3
  components/                # presentational, domain-typed
  lib/
    env.ts                   # validated server env (added with the first real data source)
tests/
  fixtures/                  # synthetic vehicles only
  support/                   # in-memory test adapter, server-only stub
  domain/ inventory/ components/ guards/
```

## Domain types (shape, not final)

```ts
// Confirmed Sheet values: "В наличии" → available, "Продана" → sold.
// No "reserved": not confirmed. Any other value → row is not public.
export type VehicleStatus = "available" | "sold";

// Mirrors the V1 public candidates in protecting-commercial-truth/field-policy.md.
export interface Vehicle {
  id: string;                 // ID, non-empty + unique, used verbatim in URL (observed AM-###)
  status: VehicleStatus;      // Статус
  make: string;               // Марка
  model: string;              // Модель
  trim: string | null;        // Комплектация
  year: number;               // Год
  priceAed: number | null;    // Цена, AED — numeric effective value
  mileageKm: number | null;   // Пробег, км — numeric effective value
  regionalSpec: string | null;// Региональная спецификация
  color: string | null;       // Цвет
  engine: string | null;      // Двигатель
  fuel: string | null;        // Топливо
  transmission: string | null;// Коробка
  drivetrain: string | null;  // Привод
  media: VehicleMedia[];      // resolved server-side from Ссылка на фото/видео (Phase 3)
}
// Not in V1: condition (pending decision), bodyType, interiorColor, description, options.
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
- Google adapters authenticate server-side with credentials from env. The concrete auth method
  (service account is one candidate) is chosen in Phase 2 when designing the live Sheets/Drive
  integration — it is not decided yet.
- Adapters read only needed ranges, validate each row, map field-by-field to `Vehicle`, and
  drop invalid/non-public rows.
- Adapters never log full rows; log row identifiers and validation error codes only.

## Caching and freshness

- Define one revalidation window for inventory (agreed with the business) and tag cached reads
  (e.g. `inventory`) so on-demand revalidation can be added.
- Phase 2 implementation (`src/inventory/freshness.ts`): `unstable_cache` over the mapped public
  snapshot (60 s, tag `inventory`) plus a 120 s hard max age that bypasses stale entries.
  Raw Sheet responses are fetched with `no-store` and never cached. `use cache` would need the
  `cacheComponents` flag; migrating is a separate, deliberate change.
- On source error, prefer showing `unavailable` over serving data older than the window.
- VDP static params: optional; dynamic rendering is acceptable for small stock.

## Testing layout

- Unit: mapping, validation, status mapping, allowlist (unknown columns ignored), env parsing.
- Component/route: each `InventoryResult` kind renders the correct state.
- Guard test: production source does not import `tests/` and contains no fixture IDs.
- Browser/E2E (Phase 6): mobile viewport flows.

## Environment variables

Rules: server-only, documented in `.env.example` without values, validated in `lib/env.ts`,
never prefixed `NEXT_PUBLIC_` for credentials or Sheet/Drive IDs.

Finalized in Phase 2: `INVENTORY_SOURCE`, `GOOGLE_SHEETS_SPREADSHEET_ID`, `GOOGLE_AUTH_MODE`
(`vercel-oidc` | `service-account-key`), `GOOGLE_SERVICE_ACCOUNT_EMAIL`,
`GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` (key mode), `GCP_PROJECT_NUMBER`,
`GCP_WORKLOAD_IDENTITY_POOL_ID`, `GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID` (OIDC mode).
Phase 3: `MEDIA_SOURCE` (`google-drive` to enable Drive media; unset = off). See
`docs/google-sheets-setup.md`.
