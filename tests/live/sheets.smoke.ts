import { describe, expect, it } from "vitest";

import { createAccessTokenProvider } from "@/adapters/google-sheets/auth";
import { headerRange } from "@/adapters/google-sheets/header";
import { loadInventorySnapshot } from "@/adapters/google-sheets/loader";
import { EXPECTED_HEADER, SHEET_TAB } from "@/adapters/google-sheets/schema";
import { createSheetsReader } from "@/adapters/google-sheets/sheets-client";
import { PUBLIC_VEHICLE_FIELDS, VEHICLE_STATUSES } from "@/domain/vehicle";
import { readInventorySourceConfig } from "@/lib/env";

/**
 * READ-ONLY live smoke test (`npm run smoke:sheets`). Requires real server env vars.
 *
 * Output is limited to: header comparison (column names are schema, not data), counts, and
 * issue codes with row numbers. It never prints IDs, prices, or any cell value.
 */
describe("live Google Sheet (read-only smoke)", () => {
  it("reads the Машины tab through the adapter", async () => {
    const config = readInventorySourceConfig();
    if (config.kind !== "google-sheets") {
      const detail = config.kind === "invalid" ? config.problems.join(", ") : "INVENTORY_SOURCE unset";
      throw new Error(`BLOCKED: live source not configured (${detail})`);
    }

    const reader = createSheetsReader({
      spreadsheetId: config.spreadsheetId,
      getAccessToken: createAccessTokenProvider(config.auth),
    });

    const header = (await reader.readRow(headerRange(SHEET_TAB))).map((cell) =>
      typeof cell === "string" ? cell.trim() : "",
    );
    const missing = EXPECTED_HEADER.filter((name) => !header.includes(name));
    const unexpected = header.filter((name) => name !== "" && !(EXPECTED_HEADER as readonly string[]).includes(name));
    const sameOrder = header.join("|") === EXPECTED_HEADER.join("|");
    console.info(
      `[smoke] header: ${header.length} columns; matches snapshot exactly: ${sameOrder}; ` +
        `missing: ${missing.join(", ") || "none"}; unexpected: ${unexpected.join(", ") || "none"}`,
    );

    const lines: string[] = [];
    const snapshot = await loadInventorySnapshot(reader, {
      log: { info: (m) => lines.push(m), warn: (m) => lines.push(m) },
    });
    for (const line of lines) console.info(`[smoke] ${line}`);

    for (const vehicle of snapshot.vehicles) {
      expect(Object.keys(vehicle).sort()).toEqual([...PUBLIC_VEHICLE_FIELDS].sort());
      expect(VEHICLE_STATUSES).toContain(vehicle.status);
    }
    expect(missing).toEqual([]);
  });
});
