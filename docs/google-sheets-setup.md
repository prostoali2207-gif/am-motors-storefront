# Google Sheets access setup

How the storefront reads the Sheet **"AM Motors — Справочник машин"** (tab `Машины`) and what a
person has to set up. No credential is ever committed; all values live in server-side env vars
(see `.env.example`).

## Identity model

One dedicated **service account** (suggested name `storefront-sheets-reader`) is the only
identity that reads the Sheet.

| Permission | Value |
| - | - |
| Sheet access | Shared with the service-account email as **Viewer** (read-only) |
| OAuth scope requested by the app | `https://www.googleapis.com/auth/spreadsheets.readonly` |
| Google Cloud project IAM roles for the service account | **None** |
| APIs enabled in the project | Google Sheets API (+ IAM Service Account Credentials API and Security Token Service API for `vercel-oidc`) |

The adapter makes two read-only calls per refresh: `values.get` for the header row, then one
`values.batchGet` (`UNFORMATTED_VALUE`) for the 14 allowlisted columns. Private columns are
never requested.

## Auth modes

| Mode (`GOOGLE_AUTH_MODE`) | Long-lived secret | Use |
| - | - | - |
| `vercel-oidc` | No | **Recommended for Vercel** (Phase 6). Vercel's OIDC token is exchanged through Google Workload Identity Federation and the service account is impersonated. |
| `service-account-key` | Yes (JSON key) | Fallback: local live smoke test before Vercel exists, or if federation cannot be set up. Delete the key once `vercel-oidc` works. |

Why: Google recommends avoiding service-account keys for workloads outside Google Cloud and
enforces "disable service account key creation" by default on organizations created since
May 2024. Vercel documents keyless OIDC federation to GCP with `google-auth-library` +
`@vercel/oidc` (<https://vercel.com/docs/oidc/gcp>), which is what `vercel-oidc` implements.

## Steps

### Common (needed now)

1. Google Cloud Console → create or select a project for the storefront.
2. APIs & Services → Library → enable **Google Sheets API**.
3. IAM & Admin → Service Accounts → **Create service account** `storefront-sheets-reader`.
   Skip "Grant this service account access to project" (no roles).
4. Open the Sheet → **Share** → add the service-account email
   (`storefront-sheets-reader@<project-id>.iam.gserviceaccount.com`) as **Viewer**, without
   notification.

### `service-account-key` (local smoke test)

5. Service account → **Keys** → Add key → Create new key → JSON. Keep the file private.
   If this is blocked by the organization policy `iam.disableServiceAccountKeyCreation`, use
   `vercel-oidc` instead of weakening the policy.
6. Create `.env.local` (git-ignored) from `.env.example`:
   - `INVENTORY_SOURCE=google-sheets`
   - `GOOGLE_SHEETS_SPREADSHEET_ID=<id from the Sheet URL>`
   - `GOOGLE_AUTH_MODE=service-account-key`
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL=<client_email from the JSON>`
   - `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=<private_key from the JSON, one line with \n>`
7. `npm run smoke:sheets` — read-only; prints header comparison, counts and issue codes only.

### `vercel-oidc` (Phase 6, when the Vercel project exists)

Verify each step against <https://vercel.com/docs/oidc/gcp> at setup time.

1. Enable **IAM Service Account Credentials API** and **Security Token Service API**.
2. Vercel project → Settings → Security → OIDC Federation: team issuer
   (`https://oidc.vercel.com/<team-slug>`).
3. Google Cloud → IAM → Workload Identity Federation → create pool (e.g. `vercel`) and an
   OIDC provider (e.g. `vercel`): issuer `https://oidc.vercel.com/<team-slug>`, allowed
   audience `https://vercel.com/<team-slug>`, mapping `google.subject = assertion.sub`, and an
   attribute condition restricted to this Vercel project (and the environments allowed to
   read inventory).
4. Grant that pool principal **Workload Identity User** on the service account (only).
5. Vercel env vars (server-side, not `NEXT_PUBLIC_`): `INVENTORY_SOURCE`,
   `GOOGLE_SHEETS_SPREADSHEET_ID`, `GOOGLE_AUTH_MODE=vercel-oidc`,
   `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GCP_PROJECT_NUMBER`, `GCP_WORKLOAD_IDENTITY_POOL_ID`,
   `GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID`. `VERCEL_OIDC_TOKEN` is provided by Vercel.

## Drive media (Phase 3, optional)

Enabled only with `MEDIA_SOURCE=google-drive`. Same service account, one more read-only grant.

| Permission | Value |
| - | - |
| Drive access | Each vehicle folder linked in `Ссылка на фото/видео` shared with the service-account email as **Viewer** (sharing the parent folder `AM Motors — Машины` as Viewer covers all current and future vehicle folders inside it) |
| Additional OAuth scope | `https://www.googleapis.com/auth/drive.readonly` (downloading file content needs more than `drive.metadata.readonly`) |
| Additional API | **Google Drive API** enabled in the same Google Cloud project |
| IAM roles | Still none |

Calls: per vehicle `files.get` (folder type) + `files.list` (direct children, fields `id,name,
mimeType,size,createdTime,md5Checksum,version` only — never owners, permissions or image
metadata/GPS); listings cached 5 minutes (tag `media`). Per image request (only on a CDN/image
cache miss): `files.get?alt=media`, re-encoded server-side without metadata.

Steps:

1. APIs & Services → Library → enable **Google Drive API**.
2. Drive → folder `AM Motors — Машины` (or each vehicle folder) → **Share** → service-account
   email → **Viewer**, without notification. Note: files uploaded by other people into a shared
   folder are visible to the service account through the folder share.
3. Set `MEDIA_SOURCE=google-drive` locally (`.env.local`) and run `npm run smoke:media`
   (read-only; prints per-vehicle state and counts only, and sanitizes one image in memory).
4. Do not enable it on a public deployment before open question 12 in
   `docs/business-rules.md` is decided.

Media failures never make the inventory unavailable: missing/invalid link, inaccessible folder,
empty folder, only unsupported files or a Drive error only empty that one vehicle's media
(customer sees "Photos unavailable"; the server logs the vehicle ID, state and counts).

## Failure behaviour

Missing/invalid env → `unavailable` (`not-configured`); variable names logged, never values.
Auth, network, HTTP, quota or malformed responses → `unavailable` (`source-error`), fixed code
logged. Missing/duplicated public header column → `unavailable` (`invalid-data`). The site never
falls back to fixtures or bundled data.
