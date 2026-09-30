import "server-only";

import { getVercelOidcToken } from "@vercel/oidc";
import { ExternalAccountClient, JWT, type AuthClient } from "google-auth-library";

import type { GoogleAuthConfig } from "@/lib/env";
import { SHEETS_READONLY_SCOPE, type AccessTokenProvider } from "./sheets-client";

/**
 * Builds a server-side access-token provider for the configured auth mode.
 *
 * Both modes end up as the same dedicated service account, which only has Viewer access to
 * the one Sheet (shared with its email) and requests only the `spreadsheets.readonly` scope —
 * plus `drive.readonly` when the Drive media source is enabled (Viewer access to the vehicle
 * media folders).
 * The service account needs no IAM roles on the Google Cloud project itself.
 *
 * - `vercel-oidc` (recommended for Vercel): no long-lived secret. The Vercel OIDC token is
 *   exchanged via Google STS (Workload Identity Federation) and the service account is
 *   impersonated. Setup: https://vercel.com/docs/oidc/gcp
 * - `service-account-key` (fallback, e.g. local smoke test): a JSON key's email + private key
 *   in env vars. Long-lived secret — rotate/delete when no longer needed.
 *
 * google-auth-library caches and refreshes the access token internally.
 */
export function createAccessTokenProvider(
  auth: GoogleAuthConfig,
  scopes: readonly string[] = [SHEETS_READONLY_SCOPE],
): AccessTokenProvider {
  const client = createAuthClient(auth, [...scopes]);
  return async () => {
    const { token } = await client.getAccessToken();
    if (!token) throw new Error("no access token");
    return token;
  };
}

function createAuthClient(auth: GoogleAuthConfig, scopes: string[]): AuthClient {
  switch (auth.mode) {
    case "service-account-key":
      return new JWT({
        email: auth.serviceAccountEmail,
        key: auth.privateKey,
        scopes,
      });
    case "vercel-oidc": {
      const audience =
        `//iam.googleapis.com/projects/${auth.projectNumber}/locations/global/` +
        `workloadIdentityPools/${auth.workloadIdentityPoolId}/providers/${auth.workloadIdentityPoolProviderId}`;
      const client = ExternalAccountClient.fromJSON({
        type: "external_account",
        audience,
        subject_token_type: "urn:ietf:params:oauth:token-type:jwt",
        token_url: "https://sts.googleapis.com/v1/token",
        service_account_impersonation_url:
          `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/` +
          `${auth.serviceAccountEmail}:generateAccessToken`, // format-validated in lib/env
        scopes,
        subject_token_supplier: {
          // Default Vercel OIDC token (aud = https://vercel.com/<team-slug>); the Google
          // provider must list that audience as allowed.
          getSubjectToken: () => getVercelOidcToken(),
        },
      });
      if (client === null) throw new Error("external account client not created");
      return client;
    }
    default: {
      const unhandled: never = auth;
      return unhandled;
    }
  }
}
