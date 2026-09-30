import { describe, expect, it } from "vitest";

import { readInventorySourceConfig } from "@/lib/env";

// Obviously fake values only.
const SA = "test-reader@test-project.iam.gserviceaccount.com";
const SHEET = "TEST_spreadsheet_id_0000000000";
const KEY = "-----BEGIN PRIVATE KEY-----\\nTESTKEYMATERIAL\\n-----END PRIVATE KEY-----\\n";

describe("readInventorySourceConfig", () => {
  it("is 'none' when no source is configured", () => {
    expect(readInventorySourceConfig({})).toEqual({ kind: "none" });
    expect(readInventorySourceConfig({ INVENTORY_SOURCE: "  " })).toEqual({ kind: "none" });
  });

  it("rejects unknown sources", () => {
    expect(readInventorySourceConfig({ INVENTORY_SOURCE: "fixtures" })).toEqual({
      kind: "invalid",
      problems: ["INVENTORY_SOURCE"],
    });
  });

  it("parses service-account-key mode and restores PEM newlines", () => {
    const config = readInventorySourceConfig({
      INVENTORY_SOURCE: "google-sheets",
      GOOGLE_SHEETS_SPREADSHEET_ID: SHEET,
      GOOGLE_AUTH_MODE: "service-account-key",
      GOOGLE_SERVICE_ACCOUNT_EMAIL: SA,
      GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: KEY,
    });
    expect(config).toEqual({
      kind: "google-sheets",
      spreadsheetId: SHEET,
      auth: {
        mode: "service-account-key",
        serviceAccountEmail: SA,
        privateKey: "-----BEGIN PRIVATE KEY-----\nTESTKEYMATERIAL\n-----END PRIVATE KEY-----\n",
      },
      media: "none",
      warnings: [],
    });
  });

  it("parses vercel-oidc mode", () => {
    expect(
      readInventorySourceConfig({
        INVENTORY_SOURCE: "google-sheets",
        GOOGLE_SHEETS_SPREADSHEET_ID: SHEET,
        GOOGLE_AUTH_MODE: "vercel-oidc",
        GOOGLE_SERVICE_ACCOUNT_EMAIL: SA,
        GCP_PROJECT_NUMBER: "123456789012",
        GCP_WORKLOAD_IDENTITY_POOL_ID: "test-pool",
        GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID: "test-provider",
      }),
    ).toEqual({
      kind: "google-sheets",
      spreadsheetId: SHEET,
      auth: {
        mode: "vercel-oidc",
        serviceAccountEmail: SA,
        projectNumber: "123456789012",
        workloadIdentityPoolId: "test-pool",
        workloadIdentityPoolProviderId: "test-provider",
      },
      media: "none",
      warnings: [],
    });
  });

  it("enables Drive media only with MEDIA_SOURCE=google-drive; a bad value disables media, not inventory", () => {
    const base = {
      INVENTORY_SOURCE: "google-sheets",
      GOOGLE_SHEETS_SPREADSHEET_ID: SHEET,
      GOOGLE_AUTH_MODE: "service-account-key",
      GOOGLE_SERVICE_ACCOUNT_EMAIL: SA,
      GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: KEY,
    };
    expect(readInventorySourceConfig({ ...base, MEDIA_SOURCE: "google-drive" })).toMatchObject({
      kind: "google-sheets",
      media: "google-drive",
      warnings: [],
    });
    expect(readInventorySourceConfig({ ...base, MEDIA_SOURCE: "https://drive.google.com/x" })).toMatchObject({
      kind: "google-sheets",
      media: "none",
      warnings: ["MEDIA_SOURCE"],
    });
    expect(JSON.stringify(readInventorySourceConfig({ ...base, MEDIA_SOURCE: "SECRET-VALUE" }))).not.toContain(
      "SECRET-VALUE",
    );
  });

  it("reports missing or malformed variables by name only, never their values", () => {
    const config = readInventorySourceConfig({
      INVENTORY_SOURCE: "google-sheets",
      GOOGLE_SHEETS_SPREADSHEET_ID: "short",
      GOOGLE_AUTH_MODE: "service-account-key",
      GOOGLE_SERVICE_ACCOUNT_EMAIL: "someone@example.com",
      GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: "SECRET-NOT-A-PEM",
    });
    expect(config).toEqual({
      kind: "invalid",
      problems: ["GOOGLE_SHEETS_SPREADSHEET_ID", "GOOGLE_SERVICE_ACCOUNT_EMAIL", "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY"],
    });
    expect(JSON.stringify(config)).not.toMatch(/SECRET|someone|short/);
  });

  it("requires an auth mode", () => {
    expect(
      readInventorySourceConfig({
        INVENTORY_SOURCE: "google-sheets",
        GOOGLE_SHEETS_SPREADSHEET_ID: SHEET,
        GOOGLE_SERVICE_ACCOUNT_EMAIL: SA,
      }),
    ).toEqual({ kind: "invalid", problems: ["GOOGLE_AUTH_MODE"] });
  });

  it("requires every workload identity variable in vercel-oidc mode", () => {
    const config = readInventorySourceConfig({
      INVENTORY_SOURCE: "google-sheets",
      GOOGLE_SHEETS_SPREADSHEET_ID: SHEET,
      GOOGLE_AUTH_MODE: "vercel-oidc",
      GOOGLE_SERVICE_ACCOUNT_EMAIL: SA,
    });
    expect(config).toEqual({
      kind: "invalid",
      problems: ["GCP_PROJECT_NUMBER", "GCP_WORKLOAD_IDENTITY_POOL_ID", "GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID"],
    });
  });
});
