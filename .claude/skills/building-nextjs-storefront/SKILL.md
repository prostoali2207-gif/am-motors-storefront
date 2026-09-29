---
name: building-nextjs-storefront
description: Builds the AM Motors storefront with Next.js App Router and strict TypeScript in a Vercel-ready architecture. Use when writing or changing application code, including project setup, routes (/, /cars, /cars/[id]), layouts, Server and Client Components, the public Vehicle domain type, the inventory repository interface, Google Sheets and Google Drive server-side adapters, environment variables and secrets, caching and revalidation, next/image and media, metadata and SEO, error, not-found and loading states, accessibility, performance and Core Web Vitals, tests, lint and build configuration.
---

# Building the Next.js storefront

## Before writing code

1. Confirm which phase the task belongs to (`docs/implementation-plan.md`). Do not implement work
   from a later phase.
2. If the change touches vehicle data, media or copy, also apply `protecting-commercial-truth`.
   If it changes UX, also apply `designing-automotive-storefront`.
3. Check current official docs for Next.js, React and any library before relying on an API.
   Framework defaults (especially caching) change between major versions — do not code from
   memory. Pin versions at setup; record the chosen versions in `CLAUDE.md`.

## Architecture

See [architecture.md](architecture.md) for the directory layout, domain types, repository
interface and caching strategy. Core shape:

```
Google Sheet ─┐                    ┌─> app/ (Server Components) ─> HTML
              ├─> adapters (server) ─> InventoryRepository ─> public Vehicle
Google Drive ─┘   validate + map         (interface)          (allowlisted)
```

- **Domain first.** `Vehicle` is the public, allowlisted type. Adapters return `Vehicle`, never
  raw rows. UI imports only domain types and the repository.
- **Repository interface** is the only way the app reads inventory. It returns an explicit
  result type that distinguishes `ok`, `empty` and `unavailable` — never throws raw errors into
  pages and never returns fake data on failure.
- **Server-only data access.** Adapter modules import `server-only`. Credentials are read from
  non-`NEXT_PUBLIC_` env vars. Validate env at startup with a schema; missing config →
  data-unavailable state, not a crash with secrets in the message.
- **Validation at the boundary.** Parse every external row with a runtime schema (e.g. zod);
  invalid rows are dropped from public output and reported server-side without logging private
  fields.

## Rules

- Server Components by default. `"use client"` only for interactive islands (gallery, sticky
  CTA visibility, share). Never pass full data objects with non-public fields into client props.
- TypeScript `strict: true`, no `any` in domain/adapters, exhaustive `switch` on status enums.
- Routes: `/`, `/cars`, `/cars/[id]`. Unknown/non-public ID → `notFound()`. Each route has
  `loading`, `error` and `not-found` handling appropriate to the data-unavailable rules.
- Caching must be explicit per data source with a documented revalidation window agreed with
  the business; status changes (sold) must propagate within that window. Prefer on-demand
  revalidation hooks later over long TTLs.
- Images: `next/image` with explicit sizes, priority only for the first VDP/hero-card image,
  remote patterns restricted to the actual media host. No hotlinking private Drive URLs.
- Metadata via `generateMetadata` from public fields only; canonical URL per VDP.
- Accessibility: semantic landmarks, one `h1` per page, labelled controls, visible focus,
  44×44 px touch targets, color contrast AA, alt text built from public fields, reduced-motion
  respected, gallery keyboard-operable.
- Performance: mobile LCP is the VDP gallery's first image; avoid client JS on listing pages,
  no layout shift from images or sticky bars.
- Fixtures: synthetic only, under test directories, obviously fake. Production code must not
  import from test directories (enforce with lint rule or test).
- No analytics, tracking pixels or third-party scripts before Phase 5 defines them.
- Deployment: no production deploys. Vercel previews only from Phase 6.

## Implementation loop

```
- [ ] Types/interfaces first, then adapter or UI
- [ ] Unit tests for mapping, validation, status and empty/unavailable paths
- [ ] Run lint, typecheck, tests, build
- [ ] Fix and re-run until clean
- [ ] Hand off to verifying-storefront before claiming completion
```
