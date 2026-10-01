# Google Sheets access setup

How the storefront reads the Sheet **"AM Motors — Справочник машин"** (tab `Машины`) and what a
person has to set up. No credential is ever committed; all values live in server-side env vars
(see `.env.example`).

## Identity model

One dedicated **service account** (suggested name `storefront-sheets-reader`) is the only
identity that reads the Sheet.

| Permission | Value |
| - | - |
| Sheet access | Link sharing **Restricted** (owner and named staff only); the service-account email added as **Viewer** (read-only) |
| OAuth scope requested by the app | `https://www.googleapis.com/auth/spreadsheets.readonly` |
| Google Cloud project IAM roles for the service account | **None** |
| APIs enabled in the project | Enabled in the storefront project (confirmed 2026-09-30): Google Sheets API, IAM API, Cloud Resource Manager API, IAM Service Account Credentials API, Security Token Service API. The runtime calls use Google Sheets, IAM Service Account Credentials and Security Token Service (`vercel-oidc`). |

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

### `vercel-oidc` (Phase 6)

Checked 2026-09-30 against <https://vercel.com/docs/oidc/gcp>,
<https://vercel.com/docs/oidc/reference> and Google's Workload Identity Federation docs.
Re-check them if the Console differs.

Vercel values (not secrets):

| Item | Value |
| - | - |
| Vercel project | `am-motors-storefront` (`prj_P1VGYeX1AUQQkowQo3PaIHE3j8If`) |
| Team slug / ID | `prostoali2207-5636s-projects` / `team_wlh3TVLEQlmcpaPCBipCW3lC` |
| OIDC issuer mode | Team → issuer `https://oidc.vercel.com/prostoali2207-5636s-projects` |
| Token audience (default, used by the code) | `https://vercel.com/prostoali2207-5636s-projects` |
| Token subject for Preview | `owner:prostoali2207-5636s-projects:project:am-motors-storefront:environment:preview` |

Google Cloud steps (same project as the service account):

1. APIs & Services → Library → enable **IAM Service Account Credentials API** and
   **Security Token Service API** (Google Sheets API is already on from "Common").
2. IAM & Admin → Workload Identity Federation → **Create pool**: name `Vercel`, ID `vercel`.
3. Add provider → **OpenID Connect (OIDC)**: name `Vercel`, ID `vercel`, issuer URL
   `https://oidc.vercel.com/prostoali2207-5636s-projects`, JWK file empty, audience
   **Allowed audiences** → `https://vercel.com/prostoali2207-5636s-projects`.
4. Provider attributes: mapping `google.subject` = `assertion.sub`. Attribute condition
   (only this Vercel project, only Preview):
   `assertion.owner_id == 'team_wlh3TVLEQlmcpaPCBipCW3lC' && assertion.project_id == 'prj_P1VGYeX1AUQQkowQo3PaIHE3j8If' && assertion.environment == 'preview'`
5. Service account `storefront-sheets-reader` → Permissions → Grant access → principal
   `principal://iam.googleapis.com/projects/<PROJECT_NUMBER>/locations/global/workloadIdentityPools/vercel/subject/owner:prostoali2207-5636s-projects:project:am-motors-storefront:environment:preview`
   → role **Workload Identity User** (`roles/iam.workloadIdentityUser`). That is the only
   grant; the service account itself still has no project roles.
6. Vercel env vars, **Preview only**, server-side (never `NEXT_PUBLIC_`): `INVENTORY_SOURCE`,
   `GOOGLE_SHEETS_SPREADSHEET_ID`, `GOOGLE_AUTH_MODE=vercel-oidc`,
   `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GCP_PROJECT_NUMBER`,
   `GCP_WORKLOAD_IDENTITY_POOL_ID=vercel`, `GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID=vercel`.
   `VERCEL_OIDC_TOKEN` is provided by Vercel. `MEDIA_SOURCE` stays unset.

Google recommends the provider's "Default audience"; that would need the code to request a
custom-audience Vercel token (`getVercelOidcToken({ audience })`). V1 uses the Vercel-documented
"Allowed audiences" option instead; the attribute condition limits access to this project's
Preview environment either way. Production gets its own principal and condition only when the
user approves a production launch.

## Drive media (Phase 3, optional)

Enabled only with `MEDIA_SOURCE=google-drive`. Same service account, one more read-only grant.

| Permission | Value |
| - | - |
| Drive access | Each vehicle folder linked in `Ссылка на фото/видео` shared with the service-account email as **Viewer** (sharing the parent folder `AM Motors — Машины` as Viewer covers all current and future vehicle folders inside it) |
| Additional OAuth scope | `https://www.googleapis.com/auth/drive.readonly` (downloading file content needs more than `drive.metadata.readonly`) |
| Additional API | **Google Drive API** enabled in the same Google Cloud project |
| IAM roles | Still none |

Calls: per vehicle `files.get` (folder type) + one `files.list` for child **folders** named
`Website` (the vehicle folder's files are never listed) + `files.list` of that one `Website`
folder's direct children (fields `id,name,mimeType,size,createdTime,md5Checksum,version` only —
never owners, permissions or image metadata/GPS), only when a VDP (or the media route) needs
that vehicle — `/` and `/cars`
make no Drive calls; folder listings cached 5 minutes (tag `media`). Per image request (only
on a CDN/image cache miss): `files.get?alt=media`, re-encoded server-side without metadata;
responses cached 20 minutes (≈ 1 hour worst case across layers).

Steps:

1. APIs & Services → Library → enable **Google Drive API** — done by the user 2026-10-01.
2. Drive → folder `AM Motors — Машины` → **Share** → service-account email → **Viewer**,
   without notification — done by the user 2026-10-01 (covers all current and future vehicle
   folders and their `Website` subfolders). Files uploaded by other people into the shared
   folder are visible to the service account through the folder share.
3. Publishing (Phase 8, `docs/business-rules.md` → "Website photos"): staff create a folder
   named exactly `Website` inside a vehicle folder and place approved images `01.jpg` (cover),
   `02.jpg`, … in it. Nothing else in the vehicle folder is ever read as media.
4. Verification without a JSON key — **passed 2026-10-01** on Vercel Preview `a7db21f` with a
   temporary, preview-only read-only diagnostic (removed before review): auth `vercel-oidc`,
   `MEDIA_SOURCE` unset; all 20 vehicle folders accessible to the service account; every
   vehicle `no-website-folder`; no `inaccessible` or `source-error`; no image to sample yet.
   `npm run smoke:media` exists for a local run but needs `service-account-key` credentials;
   do not create a key just for it.
5. `MEDIA_SOURCE` stays unset in Preview and Production until the user explicitly enables it.

Media failures never make the inventory unavailable: missing/invalid link, inaccessible folder,
empty folder, only unsupported files or a Drive error only empty that one vehicle's media
(customer sees "Photos unavailable"; the server logs the vehicle ID, state and counts).

## Failure behaviour

Missing/invalid env → `unavailable` (`not-configured`); variable names logged, never values.
Auth, network, HTTP, quota or malformed responses → `unavailable` (`source-error`), fixed code
logged. Missing/duplicated public header column → `unavailable` (`invalid-data`). The site never
falls back to fixtures or bundled data.
