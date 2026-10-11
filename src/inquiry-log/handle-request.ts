import "server-only";

import { siteOrigin } from "@/lib/site-origin";
import type { InquiryLogConfig } from "./config";
import { MAX_HANDOFF_BYTES, parseHandoff } from "./handoff";
import type { RateLimiter } from "./rate-limit";
import { handoffRow, type HandoffLogWriter } from "./sheets-writer";

/**
 * `POST /api/inquiry-ref` logic, with every dependency injected so it is testable without
 * network or Next.js runtime (issue #19). The route file only wires real dependencies.
 *
 * Order of checks: feature on → same-origin → size → JSON shape → rate → vehicle is currently
 * available → append one row. Responses carry no body and nothing from the request; logs carry
 * only fixed codes — never the click ID, the reference, UTM values or the vehicle ID.
 */

export type VehicleAvailability = "available" | "not-available" | "unknown";

export interface InquiryRefDeps {
  readonly config: InquiryLogConfig;
  readonly writer: () => HandoffLogWriter;
  readonly vehicleAvailability: (id: string) => Promise<VehicleAvailability>;
  /** Per client and per instance, short window. */
  readonly rateLimiter: RateLimiter;
  /** Per instance, per day: a hard brake on total appends (cost/quota/pollution). */
  readonly dailyBudget: RateLimiter;
  readonly now: () => Date;
  readonly log?: (code: string) => void;
}

const NO_STORE = { "Cache-Control": "no-store" };

function empty(status: number): Response {
  return new Response(null, { status, headers: NO_STORE });
}

export async function handleInquiryRefRequest(request: Request, deps: InquiryRefDeps): Promise<Response> {
  const log = deps.log ?? ((code: string) => console.warn(`[inquiry-ref] ${code}`));

  if (deps.config.kind !== "google-sheets") return empty(404);

  if (!isSameOrigin(request.headers)) return empty(403);

  const declared = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > MAX_HANDOFF_BYTES) return empty(413);
  let text: string;
  try {
    text = await request.text();
  } catch {
    return empty(400);
  }
  if (new TextEncoder().encode(text).length > MAX_HANDOFF_BYTES) return empty(413);

  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return empty(400);
  }
  const handoff = parseHandoff(data);
  if (handoff === null) return empty(400);

  const now = deps.now();
  if (!deps.rateLimiter.allow(clientKey(request.headers), now.getTime())) return empty(429);

  if (handoff.vehicleId !== null) {
    const availability = await deps.vehicleAvailability(handoff.vehicleId);
    if (availability === "unknown") {
      log("inventory-unavailable");
      return empty(503);
    }
    // Sold, reserved, unknown or non-public IDs are never logged as a handoff.
    if (availability === "not-available") return empty(422);
  }

  // Spent only for requests that would really be written.
  if (!deps.dailyBudget.allow("all", now.getTime())) {
    log("daily-budget-exhausted");
    return empty(429);
  }

  const result = await deps.writer().append(handoffRow(handoff, now));
  if (!result.ok) {
    log(`append-failed ${result.code}`);
    return empty(503);
  }
  return empty(204);
}

/**
 * Browser same-origin check: `Origin` must be present and equal the origin the request reached,
 * and `Sec-Fetch-Site`, when sent, must be `same-origin`.
 *
 * This only filters other websites' pages. It is NOT authentication: any HTTP client can forge
 * both headers and any click ID. Every row is therefore recorded as `unverified_client_report`;
 * abuse is bounded by rate limits here plus a platform firewall rule required before enabling
 * (docs/inquiry-attribution.md), and nothing in the log counts until Sales sees a real message.
 */
export function isSameOrigin(headers: Pick<Headers, "get">): boolean {
  const fetchSite = headers.get("sec-fetch-site");
  if (fetchSite !== null && fetchSite !== "same-origin") return false;
  const origin = headers.get("origin");
  const own = siteOrigin(headers);
  return origin !== null && own !== null && origin.toLowerCase() === own;
}

/** Rate-limit key: the client IP as forwarded by the platform; never stored or logged. */
function clientKey(headers: Pick<Headers, "get">): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "unknown";
}
