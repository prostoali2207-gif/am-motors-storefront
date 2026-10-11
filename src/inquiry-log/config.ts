import "server-only";

import { readInventorySourceConfig, type GoogleAuthConfig } from "@/lib/env";

/**
 * Server-only configuration of the inquiry reference log (issue #19, pending owner approval).
 *
 * OFF unless `INQUIRY_LOG=google-sheets` and everything below is valid. While off: no click ID is
 * read in the browser, no reference is shown, `/api/inquiry-ref` answers 404 — the site behaves
 * exactly as before (UTM + `Ref:` only).
 *
 * Separation from the inventory (non-negotiable, issue #19 comment of 2026-10-11):
 * - its OWN spreadsheet — never the inventory Sheet "AM Motors — Справочник машин";
 * - its OWN service account (Editor on that log spreadsheet only) — the inventory reader keeps
 *   its read-only scope and Viewer access unchanged.
 * Both are enforced here: identical values switch the feature off.
 *
 * Problems are reported by variable name only, never by value.
 */

export const INQUIRY_LOG_TAB = "Handoffs";

export type InquiryLogConfig =
  | { readonly kind: "off" }
  | { readonly kind: "invalid"; readonly problems: readonly string[] }
  | {
      readonly kind: "google-sheets";
      readonly spreadsheetId: string;
      readonly auth: GoogleAuthConfig;
    };

type Env = Readonly<Record<string, string | undefined>>;

const SERVICE_ACCOUNT_EMAIL = /^[a-z0-9-]+@[a-z0-9-]+\.iam\.gserviceaccount\.com$/;
const SPREADSHEET_ID = /^[A-Za-z0-9_-]{20,}$/;

export function readInquiryLogConfig(env: Env = process.env): InquiryLogConfig {
  const mode = value(env, "INQUIRY_LOG");
  if (mode === undefined) return { kind: "off" };
  if (mode !== "google-sheets") return { kind: "invalid", problems: ["INQUIRY_LOG"] };

  // Handoffs are accepted only for vehicles the inventory currently shows; without a working
  // inventory source the log stays off.
  const inventory = readInventorySourceConfig(env);
  if (inventory.kind !== "google-sheets") return { kind: "invalid", problems: ["INVENTORY_SOURCE"] };

  const problems: string[] = [];
  const spreadsheetId = value(env, "INQUIRY_LOG_SPREADSHEET_ID") ?? "";
  if (!SPREADSHEET_ID.test(spreadsheetId) || spreadsheetId === inventory.spreadsheetId) {
    problems.push("INQUIRY_LOG_SPREADSHEET_ID");
  }
  const email = value(env, "INQUIRY_LOG_SERVICE_ACCOUNT_EMAIL") ?? "";
  if (!SERVICE_ACCOUNT_EMAIL.test(email) || email === inventory.auth.serviceAccountEmail) {
    problems.push("INQUIRY_LOG_SERVICE_ACCOUNT_EMAIL");
  }

  let auth: GoogleAuthConfig;
  switch (inventory.auth.mode) {
    case "vercel-oidc":
      // Same Workload Identity pool/provider; a different service account is impersonated.
      auth = { ...inventory.auth, serviceAccountEmail: email };
      break;
    case "service-account-key": {
      const raw = value(env, "INQUIRY_LOG_SERVICE_ACCOUNT_PRIVATE_KEY") ?? "";
      const privateKey = raw.includes("\\n") ? raw.replaceAll("\\n", "\n") : raw;
      if (!privateKey.includes("-----BEGIN PRIVATE KEY-----")) {
        problems.push("INQUIRY_LOG_SERVICE_ACCOUNT_PRIVATE_KEY");
      }
      auth = { mode: "service-account-key", serviceAccountEmail: email, privateKey };
      break;
    }
    default: {
      const unhandled: never = inventory.auth;
      return unhandled;
    }
  }

  if (problems.length > 0) return { kind: "invalid", problems };
  return { kind: "google-sheets", spreadsheetId, auth };
}

/** For the server-rendered page: may the browser show inquiry references? */
export function inquiryRefsEnabled(env: Env = process.env): boolean {
  return readInquiryLogConfig(env).kind === "google-sheets";
}

function value(env: Env, name: string): string | undefined {
  const v = env[name]?.trim();
  return v === undefined || v === "" ? undefined : v;
}
