---
name: verifying-storefront
description: Verifies AM Motors storefront changes before any completion claim, pull request or deployment. Use when finishing a task, saying something is done, opening or updating a PR, preparing a Vercel preview, or when asked to check, test, QA or review the site. Runs build, typecheck, lint and tests, checks routes (/, /cars, /cars/[id]) and their empty, unavailable, sold and not-found states, mobile and browser rendering, accessibility basics, internal-field data leaks, secrets exposure, synthetic fixture leakage and commercial truth, then reports results faithfully.
---

# Verifying the storefront

Nothing is "done" until this skill has run and its results are reported honestly. If a check
cannot run (tool missing, no network, phase not reached), say so explicitly — never imply it
passed.

## Pick the scope

| Change type | Required sections |
| - | - |
| Docs / skills only | 1 (repo hygiene), 7 (report) |
| Code, no vehicle data | 1, 2, 3, 5, 7 |
| Vehicle data, adapters, media, vehicle copy | 1–7 (all) |
| Before any preview deployment (Phase 6+) | 1–7 plus [release-checklist.md](release-checklist.md) |
| Production deployment | Forbidden until the user explicitly approves it |

## 1. Repository hygiene

- `git status` clean except intended changes; no stray build output, `.env*` (except
  `.env.example`), credentials, service-account JSON or real Sheet exports.
- Skills: every `.claude/skills/*/SKILL.md` starts with `---` frontmatter containing `name`
  (lowercase, digits, hyphens, ≤64 chars, matches folder) and a non-empty `description`
  (≤1024 chars); body under 500 lines.

## 2. Static checks

Run the project's scripts (names are fixed in Phase 1 and listed in `CLAUDE.md`):
lint → typecheck → unit tests → production build. All must pass with zero errors. Do not
disable rules, skip tests or add `@ts-ignore` to get green.

## 3. Routes and states

With the app running locally, check each route returns the expected status and content:

- `/`, `/cars` — `ok` (with test adapter), `empty`, `unavailable` render distinct, truthful states.
- `/cars/[id]` — available (`В наличии`), sold (`Продана`), unknown/other status → 404,
  unknown `ID` → 404.
- Sold vehicles never appear in the available list or with test-drive/viewing CTAs.
- CTA labels say "Request…", not "Book…"; "Didn't find what you need?" → WhatsApp is present
  where the design places it.
- The production adapter configuration without credentials renders `unavailable`, not fixtures.

## 4. Data leaks and commercial truth

- Search the build output and rendered HTML/RSC payloads for private field names and sample
  private values used in tests: private/pending/server-only columns from `field-policy.md`
  (`VIN`, `Мин. цена, AED`, `Заметки`, `Банковский залог`, `Мулькия до`, `Состояние`,
  `Ссылка на фото/видео`, `Дата обновления`, etc.) and their mapped keys.
- Confirm no fixture IDs/makes (e.g. `test-`, `Testmake`) appear in production build output.
- Confirm no secrets or `NEXT_PUBLIC_` credentials in client bundles:
  search `.next/static` for key-like strings and env var names.
- Run the `protecting-commercial-truth` review checklist on changed vehicle UI/copy.

## 5. Browser and mobile

When a browser is available (Playwright/Chromium is preinstalled in cloud sessions):

- Mobile viewport (390×844) and desktop (1440×900) screenshots of changed pages.
- No horizontal scroll, sticky CTA not covering content, tap targets ≥44 px, images sized.
- Keyboard navigation and visible focus on changed interactive elements.
- Console has no errors; no failed network requests except intentional ones.

## 6. Performance and accessibility basics

- Run Lighthouse or equivalent on changed pages when available (mobile profile); note LCP, CLS.
- Automated a11y scan (e.g. axe) on changed pages; fix serious/critical findings.

## 7. Report

Report in this format and never overstate:

```markdown
## Verification
- Scope: [change type]
- Passed: [checks with command/output summary]
- Failed: [checks + exact error output + next step]
- Not run: [checks + why]
- Commercial truth: [reviewed / not applicable]
- Deployment: none (production forbidden) | preview URL
```

If anything failed, the task is not complete: fix, re-run the failed sections, then report again.
