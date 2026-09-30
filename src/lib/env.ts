import "server-only";

/**
 * Server-only inventory configuration, parsed from environment variables.
 *
 * Never use `NEXT_PUBLIC_*` for any of these. Problems are reported by variable name only —
 * values (keys, IDs, emails) are never echoed into logs or errors.
 */

export type GoogleAuthConfig =
  | {
      /** Keyless: Vercel OIDC token → Google Workload Identity Federation → service account. */
      readonly mode: "vercel-oidc";
      readonly serviceAccountEmail: string;
      readonly projectNumber: string;
      readonly workloadIdentityPoolId: string;
      readonly workloadIdentityPoolProviderId: string;
    }
  | {
      /** Fallback: a service-account JSON key's email + private key held in env vars. */
      readonly mode: "service-account-key";
      readonly serviceAccountEmail: string;
      readonly privateKey: string;
    };

/**
 * Vehicle media source. `none` (default): no Drive access, every vehicle has empty media.
 * `google-drive`: resolve each vehicle's folder from `Ссылка на фото/видео` (Phase 3).
 */
export type MediaSourceKind = "none" | "google-drive";

export type InventorySourceConfig =
  | { readonly kind: "none" }
  | { readonly kind: "invalid"; readonly problems: readonly string[] }
  | {
      readonly kind: "google-sheets";
      readonly spreadsheetId: string;
      readonly auth: GoogleAuthConfig;
      readonly media: MediaSourceKind;
      /** Non-fatal config problems (variable names only), e.g. an unknown MEDIA_SOURCE. */
      readonly warnings: readonly string[];
    };

type Env = Readonly<Record<string, string | undefined>>;

const SERVICE_ACCOUNT_EMAIL = /^[a-z0-9-]+@[a-z0-9-]+\.iam\.gserviceaccount\.com$/;
const SPREADSHEET_ID = /^[A-Za-z0-9_-]{20,}$/;
const DIGITS = /^\d+$/;
const POOL_OR_PROVIDER_ID = /^[a-z0-9-]{4,32}$/;

export function readInventorySourceConfig(env: Env = process.env): InventorySourceConfig {
  const source = value(env, "INVENTORY_SOURCE");
  if (source === undefined) return { kind: "none" };
  if (source !== "google-sheets") return { kind: "invalid", problems: ["INVENTORY_SOURCE"] };

  const problems: string[] = [];
  const need = (name: string, pattern?: RegExp): string => {
    const v = value(env, name);
    if (v === undefined || (pattern && !pattern.test(v))) problems.push(name);
    return v ?? "";
  };

  const spreadsheetId = need("GOOGLE_SHEETS_SPREADSHEET_ID", SPREADSHEET_ID);
  const serviceAccountEmail = need("GOOGLE_SERVICE_ACCOUNT_EMAIL", SERVICE_ACCOUNT_EMAIL);
  const mode = value(env, "GOOGLE_AUTH_MODE");

  let auth: GoogleAuthConfig | null = null;
  if (mode === "vercel-oidc") {
    auth = {
      mode,
      serviceAccountEmail,
      projectNumber: need("GCP_PROJECT_NUMBER", DIGITS),
      workloadIdentityPoolId: need("GCP_WORKLOAD_IDENTITY_POOL_ID", POOL_OR_PROVIDER_ID),
      workloadIdentityPoolProviderId: need("GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID", POOL_OR_PROVIDER_ID),
    };
  } else if (mode === "service-account-key") {
    const privateKey = normalizePrivateKey(need("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY"));
    if (privateKey !== "" && !privateKey.includes("-----BEGIN PRIVATE KEY-----")) {
      problems.push("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY");
    }
    auth = { mode, serviceAccountEmail, privateKey };
  } else {
    problems.push("GOOGLE_AUTH_MODE");
  }

  if (problems.length > 0 || auth === null) return { kind: "invalid", problems };

  // Media is optional: a bad value disables media only, never the inventory.
  const mediaValue = value(env, "MEDIA_SOURCE");
  const media: MediaSourceKind = mediaValue === "google-drive" ? "google-drive" : "none";
  const warnings = mediaValue !== undefined && mediaValue !== "google-drive" ? ["MEDIA_SOURCE"] : [];

  return { kind: "google-sheets", spreadsheetId, auth, media, warnings };
}

function value(env: Env, name: string): string | undefined {
  const v = env[name]?.trim();
  return v === undefined || v === "" ? undefined : v;
}

/** Env UIs often store PEM keys with literal `\n`; restore real newlines. */
function normalizePrivateKey(key: string): string {
  return key.includes("\\n") ? key.replaceAll("\\n", "\n") : key;
}
