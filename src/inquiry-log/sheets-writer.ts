import "server-only";

import { ATTRIBUTION_KEYS } from "@/attribution/attribution";
import type { AccessTokenProvider } from "@/adapters/google-sheets/sheets-client";
import type { Handoff } from "./handoff";
import { INQUIRY_LOG_TAB } from "./config";

/**
 * Append-only writer for the inquiry reference log (issue #19).
 *
 * Calls exactly one Sheets API method, `spreadsheets.values.append`, on one tab of the separate
 * log spreadsheet. It never reads, updates or deletes rows, and never touches the inventory Sheet.
 * `valueInputOption=RAW` stores every cell as literal text, so a value such as `=HYPERLINK(...)`
 * from a hostile URL is never evaluated as a formula.
 */

export const SPREADSHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";
const API_BASE = "https://sheets.googleapis.com/v4/spreadsheets";
const TIMEOUT_MS = 8_000;

/** Column order of the `Handoffs` tab. Row 1 of the tab must carry exactly these headers. */
export const HANDOFF_COLUMNS = [
  "received_at_utc",
  "inquiry_ref",
  "event",
  "click_id_type",
  "click_id",
  "vehicle_ref",
  "intent",
  "page_locale",
  ...ATTRIBUTION_KEYS,
] as const;

export function handoffRow(handoff: Handoff, receivedAt: Date): string[] {
  return [
    receivedAt.toISOString(),
    handoff.ref,
    "handoff_initiated",
    handoff.click.type,
    handoff.click.value,
    handoff.vehicleId ?? "",
    handoff.intent,
    handoff.locale,
    ...ATTRIBUTION_KEYS.map((key) => handoff.utm[key] ?? ""),
  ];
}

export type AppendResult = { readonly ok: true } | { readonly ok: false; readonly code: string };

export interface HandoffLogWriter {
  append(row: readonly string[]): Promise<AppendResult>;
}

export function createSheetsHandoffWriter(options: {
  readonly spreadsheetId: string;
  readonly getAccessToken: AccessTokenProvider;
  readonly fetchImpl?: typeof fetch;
}): HandoffLogWriter {
  const fetchImpl = options.fetchImpl ?? fetch;
  const range = encodeURIComponent(`${INQUIRY_LOG_TAB}!A:${columnLetter(HANDOFF_COLUMNS.length)}`);
  const params = new URLSearchParams({ valueInputOption: "RAW", insertDataOption: "INSERT_ROWS" });
  const url = `${API_BASE}/${encodeURIComponent(options.spreadsheetId)}/values/${range}:append?${params}`;

  return {
    async append(row) {
      let token: string;
      try {
        token = await options.getAccessToken();
      } catch {
        return { ok: false, code: "auth-failed" };
      }
      try {
        const response = await fetchImpl(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ majorDimension: "ROWS", values: [row] }),
          cache: "no-store",
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        // The upstream body is never read into logs (it can echo the row).
        return response.ok ? { ok: true } : { ok: false, code: `http-${response.status}` };
      } catch (error) {
        const timedOut = typeof error === "object" && error !== null && (error as { name?: unknown }).name === "TimeoutError";
        return { ok: false, code: timedOut ? "timeout" : "network" };
      }
    },
  };
}

/** 1 → A, 13 → M (enough for this fixed, short column list). */
function columnLetter(count: number): string {
  return String.fromCharCode("A".charCodeAt(0) + count - 1);
}
