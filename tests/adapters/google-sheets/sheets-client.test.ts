import { describe, expect, it, vi } from "vitest";

import { createSheetsReader, SHEETS_READONLY_SCOPE } from "@/adapters/google-sheets/sheets-client";

const SPREADSHEET = "TEST_spreadsheet_id_0000000000";
const TOKEN = "test-access-token";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function reader(fetchImpl: typeof fetch, getAccessToken = async () => TOKEN) {
  return createSheetsReader({ spreadsheetId: SPREADSHEET, getAccessToken, fetchImpl });
}

describe("createSheetsReader", () => {
  it("uses the read-only scope constant", () => {
    expect(SHEETS_READONLY_SCOPE).toBe("https://www.googleapis.com/auth/spreadsheets.readonly");
  });

  it("reads a header row with a bearer token, no-store, formatted values", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ range: "x", majorDimension: "ROWS", values: [["ID", "Марка"]] }));
    await expect(reader(fetchImpl).readRow("'Машины'!1:1")).resolves.toEqual(["ID", "Марка"]);

    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    const parsed = new URL(url);
    expect(parsed.origin + decodeURIComponent(parsed.pathname)).toBe(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET}/values/'Машины'!1:1`,
    );
    expect(parsed.searchParams.get("valueRenderOption")).toBe("FORMATTED_VALUE");
    expect(parsed.searchParams.get("majorDimension")).toBe("ROWS");
    expect(init.method).toBe("GET");
    expect(init.cache).toBe("no-store");
    expect((init.headers as Record<string, string>).Authorization).toBe(`Bearer ${TOKEN}`);
  });

  it("batch-reads all ranges in one request with UNFORMATTED_VALUE", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ valueRanges: [{ values: [["Год", 2001]] }, { range: "empty" }] }),
    );
    const columns = await reader(fetchImpl).readColumns(["'Машины'!E1:E", "'Машины'!F1:F"]);
    expect(columns).toEqual([["Год", 2001], []]);

    expect(fetchImpl).toHaveBeenCalledOnce();
    const [requestUrl] = fetchImpl.mock.calls[0] as unknown as [string];
    const url = new URL(requestUrl);
    expect(url.pathname).toBe(`/v4/spreadsheets/${SPREADSHEET}/values:batchGet`);
    expect(url.searchParams.getAll("ranges")).toEqual(["'Машины'!E1:E", "'Машины'!F1:F"]);
    expect(url.searchParams.get("majorDimension")).toBe("COLUMNS");
    expect(url.searchParams.get("valueRenderOption")).toBe("UNFORMATTED_VALUE");
  });

  it.each([
    [401, "http-401"],
    [403, "http-403"],
    [404, "http-404"],
    [429, "http-429"],
    [500, "http-5xx"],
    [503, "http-5xx"],
  ])("maps HTTP %i to %s without leaking the response body", async (status, code) => {
    const fetchImpl = vi.fn(async () => jsonResponse({ error: { message: "SECRET-UPSTREAM-BODY" } }, status));
    const error = await reader(fetchImpl).readRow("'Машины'!1:1").catch((e: unknown) => e);
    expect(error).toMatchObject({ name: "InventorySourceError", reason: "source-error", code });
    expect(String((error as Error).message)).not.toContain("SECRET-UPSTREAM-BODY");
  });

  it("maps token failures to auth-failed without the underlying message", async () => {
    const fetchImpl = vi.fn();
    const error = await reader(fetchImpl as unknown as typeof fetch, async () => {
      throw new Error("SECRET-KEY-MATERIAL invalid_grant");
    })
      .readRow("'Машины'!1:1")
      .catch((e: unknown) => e);
    expect(error).toMatchObject({ code: "auth-failed" });
    expect((error as Error).message).not.toContain("SECRET-KEY-MATERIAL");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("maps network failures and timeouts", async () => {
    const network = vi.fn(async () => {
      throw new TypeError("fetch failed");
    });
    await expect(reader(network).readRow("r")).rejects.toMatchObject({ code: "network" });

    const timeout = vi.fn(async () => {
      throw new DOMException("timed out", "TimeoutError");
    });
    await expect(reader(timeout).readRow("r")).rejects.toMatchObject({ code: "timeout" });
  });

  it.each([
    ["not json", new Response("<html>", { status: 200 })],
    ["wrong range count", jsonResponse({ valueRanges: [] })],
    ["values not a matrix", jsonResponse({ valueRanges: [{ values: "x" }] })],
  ])("rejects malformed responses (%s)", async (_label, response) => {
    const fetchImpl = vi.fn(async () => response);
    await expect(reader(fetchImpl).readColumns(["a"])).rejects.toMatchObject({
      code: "malformed-response",
    });
  });
});
