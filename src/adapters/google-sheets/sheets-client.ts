import { InventorySourceError } from "@/inventory/source-error";

/**
 * Minimal read-only client for the Google Sheets API v4 `values` endpoints.
 *
 * - Scope: `spreadsheets.readonly`; only `values.get` / `values.batchGet` are called.
 * - Responses are never cached by Next's fetch cache (`no-store`): only the mapped public
 *   vehicles are cached, one layer up.
 * - Failures become `InventorySourceError` with a fixed code; upstream bodies are not read
 *   into errors or logs.
 */

export const SHEETS_READONLY_SCOPE = "https://www.googleapis.com/auth/spreadsheets.readonly";
const API_BASE = "https://sheets.googleapis.com/v4/spreadsheets";
const DEFAULT_TIMEOUT_MS = 10_000;

export type ValueRenderOption = "FORMATTED_VALUE" | "UNFORMATTED_VALUE";
export type AccessTokenProvider = () => Promise<string>;

export interface SheetsReader {
  /** First row of the range, as displayed. */
  readRow(range: string): Promise<unknown[]>;
  /** One array of cells per single-column range, in request order (trailing empties trimmed). */
  readColumns(ranges: readonly string[], render: ValueRenderOption): Promise<unknown[][]>;
}

export interface SheetsReaderOptions {
  readonly spreadsheetId: string;
  readonly getAccessToken: AccessTokenProvider;
  readonly fetchImpl?: typeof fetch;
  readonly timeoutMs?: number;
}

export function createSheetsReader(options: SheetsReaderOptions): SheetsReader {
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const base = `${API_BASE}/${encodeURIComponent(options.spreadsheetId)}`;

  async function getJson(url: string): Promise<unknown> {
    let token: string;
    try {
      token = await options.getAccessToken();
    } catch {
      throw new InventorySourceError("source-error", "auth-failed");
    }
    if (typeof token !== "string" || token === "") {
      throw new InventorySourceError("source-error", "auth-failed");
    }

    let response: Response;
    try {
      response = await fetchImpl(url, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        cache: "no-store",
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      // DOMException is not an Error subclass in every runtime; check the name only.
      const timedOut = isRecord(error) && error.name === "TimeoutError";
      throw new InventorySourceError("source-error", timedOut ? "timeout" : "network");
    }

    if (!response.ok) {
      const status = response.status;
      throw new InventorySourceError("source-error", status >= 500 ? "http-5xx" : `http-${status}`);
    }

    try {
      return await response.json();
    } catch {
      throw new InventorySourceError("source-error", "malformed-response");
    }
  }

  return {
    async readRow(range) {
      const params = new URLSearchParams({
        majorDimension: "ROWS",
        valueRenderOption: "FORMATTED_VALUE",
      });
      const body = await getJson(`${base}/values/${encodeURIComponent(range)}?${params}`);
      return firstLine(valuesOf(body));
    },

    async readColumns(ranges, render) {
      const params = new URLSearchParams({ majorDimension: "COLUMNS", valueRenderOption: render });
      for (const range of ranges) params.append("ranges", range);
      const body = await getJson(`${base}/values:batchGet?${params}`);

      const valueRanges = isRecord(body) ? body.valueRanges : undefined;
      if (!Array.isArray(valueRanges) || valueRanges.length !== ranges.length) {
        throw new InventorySourceError("source-error", "malformed-response");
      }
      return valueRanges.map((valueRange) => firstLine(valuesOf(valueRange)));
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** `values` is omitted by the API when the range is empty. */
function valuesOf(valueRange: unknown): unknown[][] {
  if (!isRecord(valueRange)) throw new InventorySourceError("source-error", "malformed-response");
  const values = valueRange.values;
  if (values === undefined) return [];
  if (!Array.isArray(values) || !values.every(Array.isArray)) {
    throw new InventorySourceError("source-error", "malformed-response");
  }
  return values as unknown[][];
}

function firstLine(values: unknown[][]): unknown[] {
  return values[0] ?? [];
}
