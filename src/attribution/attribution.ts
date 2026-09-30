/**
 * Minimal ad attribution for WhatsApp inquiries (Phase 5).
 *
 * Only these incoming URL parameters are ever read or kept. Values are taken exactly as received
 * (after removing control characters and capping the length); nothing is inferred or filled in.
 * Ad click IDs (fbclid, gclid, …) are deliberately not captured in V1: nothing downstream consumes
 * them (open question 15). No vehicle or Sheet data belongs here.
 *
 * Isolated on purpose: a later analytics / CRM handoff can replace this module without touching
 * the message templates or components.
 */

export const ATTRIBUTION_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
] as const;

export type AttributionKey = (typeof ATTRIBUTION_KEYS)[number];

export type Attribution = Readonly<Partial<Record<AttributionKey, string>>>;

/** Labels of the block appended to a WhatsApp message, in this order. */
const LABELS: Readonly<Record<AttributionKey, string>> = {
  utm_source: "Source",
  utm_medium: "Medium",
  utm_campaign: "Campaign",
  utm_content: "Content",
  utm_term: "Term",
};

const MAX_LENGTH: Readonly<Record<AttributionKey, number>> = {
  utm_source: 100,
  utm_medium: 100,
  utm_campaign: 150,
  utm_content: 150,
  utm_term: 100,
};

/**
 * One line of plain text: control characters (incl. new lines) removed, whitespace collapsed,
 * length capped. A value cannot add lines to the message. Empty → undefined.
 */
export function sanitizeAttributionValue(key: AttributionKey, value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const clean = value
    .replace(/\p{Cc}|\p{Cf}|\p{Zl}|\p{Zp}/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (clean === "") return undefined;
  return Array.from(clean).slice(0, MAX_LENGTH[key]).join("").trim();
}

/** Known parameters from a query string (`?a=b…`); the first occurrence of each key wins. */
export function parseAttribution(search: string): Attribution {
  const params = new URLSearchParams(search);
  const result: Partial<Record<AttributionKey, string>> = {};
  for (const key of ATTRIBUTION_KEYS) {
    const value = sanitizeAttributionValue(key, params.get(key));
    if (value !== undefined) result[key] = value;
  }
  return result;
}

/** Re-validates stored data: only known keys with usable string values survive. */
export function normalizeAttribution(data: unknown): Attribution {
  if (typeof data !== "object" || data === null) return {};
  const record = data as Record<string, unknown>;
  const result: Partial<Record<AttributionKey, string>> = {};
  for (const key of ATTRIBUTION_KEYS) {
    const value = sanitizeAttributionValue(key, record[key]);
    if (value !== undefined) result[key] = value;
  }
  return result;
}

export function hasAttribution(attribution: Attribution): boolean {
  return ATTRIBUTION_KEYS.some((key) => attribution[key] !== undefined);
}

/**
 * First touch: once a session has attribution, later landings never overwrite it. A landing
 * without any known parameter changes nothing.
 */
export function firstTouch(stored: Attribution, incoming: Attribution): Attribution {
  return hasAttribution(stored) ? stored : incoming;
}

/** "Source: instagram\nCampaign: yaris_reel" — only the values actually received. */
export function formatAttributionBlock(attribution: Attribution): string {
  return ATTRIBUTION_KEYS.filter((key) => attribution[key] !== undefined)
    .map((key) => `${LABELS[key]}: ${attribution[key]}`)
    .join("\n");
}
