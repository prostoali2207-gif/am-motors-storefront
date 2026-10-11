import { describe, expect, it, vi } from "vitest";

import { inquiryRefsEnabled, readInquiryLogConfig } from "@/inquiry-log/config";
import { handleInquiryRefRequest, isSameOrigin, type InquiryRefDeps } from "@/inquiry-log/handle-request";
import { MAX_HANDOFF_BYTES, parseHandoff } from "@/inquiry-log/handoff";
import { createRateLimiter } from "@/inquiry-log/rate-limit";
import { createSheetsHandoffWriter, HANDOFF_COLUMNS, handoffRow, type HandoffLogWriter } from "@/inquiry-log/sheets-writer";

// Synthetic values only (obviously fake).
const INVENTORY_SHEET = "inventorySheetSYNTHETIC00001";
const LOG_SHEET = "inquiryLogSheetSYNTHETIC0001";
const BASE_ENV = {
  INVENTORY_SOURCE: "google-sheets",
  GOOGLE_SHEETS_SPREADSHEET_ID: INVENTORY_SHEET,
  GOOGLE_AUTH_MODE: "vercel-oidc",
  GOOGLE_SERVICE_ACCOUNT_EMAIL: "inventory-reader@test-project.iam.gserviceaccount.com",
  GCP_PROJECT_NUMBER: "123456789",
  GCP_WORKLOAD_IDENTITY_POOL_ID: "vercel",
  GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID: "vercel",
};
const LOG_ENV = {
  ...BASE_ENV,
  INQUIRY_LOG: "google-sheets",
  INQUIRY_LOG_SPREADSHEET_ID: LOG_SHEET,
  INQUIRY_LOG_SERVICE_ACCOUNT_EMAIL: "inquiry-log-writer@test-project.iam.gserviceaccount.com",
};

const GCLID = "Cj0KCQsynthetic_TEST-gclid0001";
const VALID = {
  ref: "G-7K3M9P",
  click: { type: "gclid", value: GCLID },
  vehicleId: "TEST-0001",
  intent: "viewing",
  locale: "ru",
  utm: { utm_source: "google", utm_medium: "cpc", utm_campaign: "123", notes: "PRIVATE" },
};

describe("readInquiryLogConfig", () => {
  it("is off by default and when the inventory is the only source", () => {
    expect(readInquiryLogConfig({})).toEqual({ kind: "off" });
    expect(readInquiryLogConfig(BASE_ENV)).toEqual({ kind: "off" });
    expect(inquiryRefsEnabled(BASE_ENV)).toBe(false);
  });

  it("enables with a separate sheet and a separate service account on the same identity pool", () => {
    const config = readInquiryLogConfig(LOG_ENV);
    expect(config).toEqual({
      kind: "google-sheets",
      spreadsheetId: LOG_SHEET,
      auth: {
        mode: "vercel-oidc",
        serviceAccountEmail: LOG_ENV.INQUIRY_LOG_SERVICE_ACCOUNT_EMAIL,
        projectNumber: "123456789",
        workloadIdentityPoolId: "vercel",
        workloadIdentityPoolProviderId: "vercel",
      },
    });
    expect(inquiryRefsEnabled(LOG_ENV)).toBe(true);
  });

  it("refuses to write into the inventory Sheet or as the inventory reader", () => {
    expect(readInquiryLogConfig({ ...LOG_ENV, INQUIRY_LOG_SPREADSHEET_ID: INVENTORY_SHEET })).toEqual({
      kind: "invalid",
      problems: ["INQUIRY_LOG_SPREADSHEET_ID"],
    });
    expect(
      readInquiryLogConfig({ ...LOG_ENV, INQUIRY_LOG_SERVICE_ACCOUNT_EMAIL: BASE_ENV.GOOGLE_SERVICE_ACCOUNT_EMAIL }),
    ).toEqual({ kind: "invalid", problems: ["INQUIRY_LOG_SERVICE_ACCOUNT_EMAIL"] });
  });

  it("stays off without a working inventory source or with an unknown mode; names variables only", () => {
    expect(readInquiryLogConfig({ ...LOG_ENV, INVENTORY_SOURCE: undefined })).toEqual({ kind: "invalid", problems: ["INVENTORY_SOURCE"] });
    expect(readInquiryLogConfig({ ...LOG_ENV, INQUIRY_LOG: "yes" })).toEqual({ kind: "invalid", problems: ["INQUIRY_LOG"] });
    const bad = readInquiryLogConfig({ ...LOG_ENV, INQUIRY_LOG_SPREADSHEET_ID: "x" });
    expect(JSON.stringify(bad)).not.toContain(LOG_SHEET);
  });

  it("key mode needs the log writer's own private key", () => {
    const keyEnv = {
      ...LOG_ENV,
      GOOGLE_AUTH_MODE: "service-account-key",
      GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: "-----BEGIN PRIVATE KEY-----\\nSYNTHETIC\\n-----END PRIVATE KEY-----",
    };
    expect(readInquiryLogConfig(keyEnv)).toEqual({ kind: "invalid", problems: ["INQUIRY_LOG_SERVICE_ACCOUNT_PRIVATE_KEY"] });
    const ok = readInquiryLogConfig({
      ...keyEnv,
      INQUIRY_LOG_SERVICE_ACCOUNT_PRIVATE_KEY: "-----BEGIN PRIVATE KEY-----\\nLOGSYNTH\\n-----END PRIVATE KEY-----",
    });
    expect(ok.kind).toBe("google-sheets");
    if (ok.kind === "google-sheets" && ok.auth.mode === "service-account-key") {
      expect(ok.auth.privateKey).toContain("LOGSYNTH");
      expect(ok.auth.privateKey).not.toContain("\\n");
    }
  });
});

describe("parseHandoff", () => {
  it("accepts a valid handoff and keeps only allowlisted UTM keys", () => {
    expect(parseHandoff(VALID)).toEqual({
      ref: "G-7K3M9P",
      click: { type: "gclid", value: GCLID },
      vehicleId: "TEST-0001",
      intent: "viewing",
      locale: "ru",
      utm: { utm_source: "google", utm_medium: "cpc", utm_campaign: "123" },
    });
  });

  it("accepts the general request only without a vehicle", () => {
    expect(parseHandoff({ ...VALID, intent: "general", vehicleId: null })?.vehicleId).toBeNull();
    expect(parseHandoff({ ...VALID, intent: "general" })).toBeNull();
    expect(parseHandoff({ ...VALID, vehicleId: null })).toBeNull();
  });

  it("rejects bad refs, click IDs, intents, locales, IDs and shapes", () => {
    expect(parseHandoff({ ...VALID, ref: "G-ABC" })).toBeNull();
    expect(parseHandoff({ ...VALID, click: { type: "fbclid", value: GCLID } })).toBeNull();
    expect(parseHandoff({ ...VALID, intent: "book" })).toBeNull();
    expect(parseHandoff({ ...VALID, locale: "fr" })).toBeNull();
    expect(parseHandoff({ ...VALID, vehicleId: "" })).toBeNull();
    expect(parseHandoff({ ...VALID, vehicleId: "x".repeat(65) })).toBeNull();
    expect(parseHandoff({ ...VALID, vehicleId: "TEST-0001\n" })).toBeNull();
    expect(parseHandoff([VALID])).toBeNull();
    expect(parseHandoff(null)).toBeNull();
  });
});

describe("handoffRow", () => {
  it("matches the documented column order and marks the event as a handoff only", () => {
    const handoff = parseHandoff(VALID);
    if (handoff === null) throw new Error("fixture");
    const row = handoffRow(handoff, new Date("2026-10-11T10:00:00.000Z"));
    expect(row).toHaveLength(HANDOFF_COLUMNS.length);
    expect(row).toEqual([
      "2026-10-11T10:00:00.000Z",
      "G-7K3M9P",
      "handoff_initiated",
      "unverified_client_report",
      "gclid",
      GCLID,
      "TEST-0001",
      "viewing",
      "ru",
      "google",
      "cpc",
      "123",
      "",
      "",
    ]);
  });
});

describe("createSheetsHandoffWriter", () => {
  it("calls only values.append on the Handoffs tab of the log sheet, RAW input", async () => {
    const fetchImpl = vi.fn(async () => new Response("{}", { status: 200 }));
    const writer = createSheetsHandoffWriter({
      spreadsheetId: LOG_SHEET,
      getAccessToken: async () => "token",
      fetchImpl,
    });
    expect(await writer.append(["a"])).toEqual({ ok: true });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(
      `https://sheets.googleapis.com/v4/spreadsheets/${LOG_SHEET}/values/Handoffs!A%3AN:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    );
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({ majorDimension: "ROWS", values: [["a"]] });
  });

  it("returns fixed failure codes without reading the upstream body", async () => {
    const writer = (fetchImpl: typeof fetch) =>
      createSheetsHandoffWriter({ spreadsheetId: LOG_SHEET, getAccessToken: async () => "t", fetchImpl });
    expect(await writer(async () => new Response("secret row echo", { status: 403 })).append([])).toEqual({
      ok: false,
      code: "http-403",
    });
    expect(
      await writer(async () => {
        throw new TypeError("network down");
      }).append([]),
    ).toEqual({ ok: false, code: "network" });
    const noToken = createSheetsHandoffWriter({
      spreadsheetId: LOG_SHEET,
      getAccessToken: async () => {
        throw new Error("no");
      },
    });
    expect(await noToken.append([])).toEqual({ ok: false, code: "auth-failed" });
  });
});

describe("createRateLimiter", () => {
  it("limits per key and in total within a window, then resets", () => {
    const limiter = createRateLimiter({ perKey: 2, total: 3, windowMs: 1000 });
    expect([limiter.allow("a", 0), limiter.allow("a", 1), limiter.allow("a", 2)]).toEqual([true, true, false]);
    expect([limiter.allow("b", 3), limiter.allow("c", 4)]).toEqual([true, false]);
    expect(limiter.allow("a", 1000)).toBe(true);
  });
});

describe("isSameOrigin", () => {
  const headers = (entries: Record<string, string>) => new Headers(entries);
  it("requires Origin equal to the reached origin; Sec-Fetch-Site, if sent, must be same-origin", () => {
    // A forged Sec-Fetch-Site alone is not enough (the review's spoof case).
    expect(isSameOrigin(headers({ "sec-fetch-site": "same-origin" }))).toBe(false);
    expect(isSameOrigin(headers({ "sec-fetch-site": "same-origin", origin: "https://shop.test", host: "shop.test" }))).toBe(true);
    expect(isSameOrigin(headers({ "sec-fetch-site": "same-origin", origin: "https://evil.test", host: "shop.test" }))).toBe(false);
    expect(isSameOrigin(headers({ "sec-fetch-site": "cross-site", origin: "https://shop.test" , host: "shop.test" }))).toBe(false);
    expect(isSameOrigin(headers({ origin: "https://shop.test", host: "shop.test" }))).toBe(true);
    expect(isSameOrigin(headers({ origin: "https://evil.test", host: "shop.test" }))).toBe(false);
    expect(isSameOrigin(headers({ host: "shop.test" }))).toBe(false);
  });
});

describe("handleInquiryRefRequest", () => {
  function setup(overrides: Partial<InquiryRefDeps> = {}) {
    const append = vi.fn<HandoffLogWriter["append"]>(async () => ({ ok: true }) as const);
    const log = vi.fn();
    const config = readInquiryLogConfig(LOG_ENV);
    const deps: InquiryRefDeps = {
      config,
      writer: () => ({ append }),
      vehicleAvailability: async () => "available",
      rateLimiter: createRateLimiter({ perKey: 100, total: 100, windowMs: 60_000 }),
      dailyBudget: createRateLimiter({ perKey: 1_000, total: 1_000, windowMs: 86_400_000 }),
      now: () => new Date("2026-10-11T10:00:00.000Z"),
      log,
      ...overrides,
    };
    return { deps, append, log };
  }

  function post(body: unknown, extraHeaders: Record<string, string> = {}) {
    const text = typeof body === "string" ? body : JSON.stringify(body);
    return new Request("https://shop.test/api/inquiry-ref", {
      method: "POST",
      headers: {
        "sec-fetch-site": "same-origin",
        origin: "https://shop.test",
        host: "shop.test",
        "content-type": "text/plain;charset=UTF-8",
        ...extraHeaders,
      },
      body: text,
    });
  }

  it("appends exactly one handoff row and answers 204 with no body", async () => {
    const { deps, append } = setup();
    const response = await handleInquiryRefRequest(post(VALID), deps);
    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(append).toHaveBeenCalledTimes(1);
    expect(append.mock.calls[0]?.[0][2]).toBe("handoff_initiated");
  });

  it("is 404 while the feature is off", async () => {
    const { deps, append } = setup({ config: { kind: "off" } });
    expect((await handleInquiryRefRequest(post(VALID), deps)).status).toBe(404);
    expect(append).not.toHaveBeenCalled();
  });

  it("rejects cross-site, oversized, malformed and invalid requests without writing", async () => {
    const { deps, append } = setup();
    expect((await handleInquiryRefRequest(post(VALID, { "sec-fetch-site": "cross-site" }), deps)).status).toBe(403);
    expect((await handleInquiryRefRequest(post("x".repeat(MAX_HANDOFF_BYTES + 1)), deps)).status).toBe(413);
    expect((await handleInquiryRefRequest(post("{not json"), deps)).status).toBe(400);
    expect((await handleInquiryRefRequest(post({ ...VALID, ref: "G-1" }), deps)).status).toBe(400);
    expect(append).not.toHaveBeenCalled();
  });

  it("never logs sold, reserved or unknown vehicles; 503 when the inventory cannot be read", async () => {
    const notAvailable = setup({ vehicleAvailability: async () => "not-available" });
    expect((await handleInquiryRefRequest(post(VALID), notAvailable.deps)).status).toBe(422);
    expect(notAvailable.append).not.toHaveBeenCalled();

    const unknown = setup({ vehicleAvailability: async () => "unknown" });
    expect((await handleInquiryRefRequest(post(VALID), unknown.deps)).status).toBe(503);
    expect(unknown.append).not.toHaveBeenCalled();
  });

  it("does not look up a vehicle for the general request", async () => {
    const lookup = vi.fn(async () => "available" as const);
    const { deps, append } = setup({ vehicleAvailability: lookup });
    const response = await handleInquiryRefRequest(post({ ...VALID, intent: "general", vehicleId: null }), deps);
    expect(response.status).toBe(204);
    expect(lookup).not.toHaveBeenCalled();
    expect(append).toHaveBeenCalledTimes(1);
  });

  it("rate-limits per client", async () => {
    const { deps } = setup({ rateLimiter: createRateLimiter({ perKey: 1, total: 10, windowMs: 60_000 }) });
    const ip = { "x-forwarded-for": "203.0.113.7" };
    expect((await handleInquiryRefRequest(post(VALID, ip), deps)).status).toBe(204);
    expect((await handleInquiryRefRequest(post(VALID, ip), deps)).status).toBe(429);
  });

  it("rejects forged-looking requests: no Origin, foreign Origin, forged ref/click shapes", async () => {
    const { deps, append } = setup();
    const noOrigin = new Request("https://shop.test/api/inquiry-ref", {
      method: "POST",
      headers: { "sec-fetch-site": "same-origin", host: "shop.test" },
      body: JSON.stringify(VALID),
    });
    expect((await handleInquiryRefRequest(noOrigin, deps)).status).toBe(403);
    expect((await handleInquiryRefRequest(post(VALID, { origin: "https://evil.test" }), deps)).status).toBe(403);
    expect((await handleInquiryRefRequest(post({ ...VALID, ref: "G-AAAAAA\n=CMD()" }), deps)).status).toBe(400);
    expect((await handleInquiryRefRequest(post({ ...VALID, click: { type: "gclid", value: "=IMPORTXML(1)" } }), deps)).status).toBe(400);
    expect((await handleInquiryRefRequest(post({ ...VALID, extra: "x".repeat(MAX_HANDOFF_BYTES) }), deps)).status).toBe(413);
    expect(append).not.toHaveBeenCalled();
  });

  it("stops writing once the per-instance daily budget is spent, without counting rejected requests", async () => {
    const { deps, append, log } = setup({
      dailyBudget: createRateLimiter({ perKey: 2, total: 2, windowMs: 86_400_000 }),
      vehicleAvailability: async (id) => (id === "TEST-0001" ? "available" : "not-available"),
    });
    expect((await handleInquiryRefRequest(post({ ...VALID, vehicleId: "TEST-SOLD" }), deps)).status).toBe(422);
    expect((await handleInquiryRefRequest(post(VALID), deps)).status).toBe(204);
    expect((await handleInquiryRefRequest(post(VALID), deps)).status).toBe(204);
    expect((await handleInquiryRefRequest(post(VALID), deps)).status).toBe(429);
    expect(append).toHaveBeenCalledTimes(2);
    expect(log).toHaveBeenCalledWith("daily-budget-exhausted");
  });

  it("records every row as an unverified client report", async () => {
    const { deps, append } = setup();
    await handleInquiryRefRequest(post(VALID), deps);
    expect(append.mock.calls[0]?.[0][3]).toBe("unverified_client_report");
  });

  it("logs only fixed codes when the append fails — never request values", async () => {
    const { deps, log } = setup({ writer: () => ({ append: async () => ({ ok: false, code: "http-403" }) }) });
    expect((await handleInquiryRefRequest(post(VALID), deps)).status).toBe(503);
    expect(log).toHaveBeenCalledWith("append-failed http-403");
    const logged = JSON.stringify(log.mock.calls);
    for (const secret of [GCLID, "G-7K3M9P", "TEST-0001", "google"]) expect(logged).not.toContain(secret);
  });
});
