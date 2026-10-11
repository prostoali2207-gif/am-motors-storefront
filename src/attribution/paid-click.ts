/**
 * Google Ads click IDs and the short inquiry reference (issue #19, pending owner approval).
 *
 * Pure functions only — no storage, no network. Used by the browser session store
 * (./session-attribution.ts) and re-validated by the server (src/inquiry-log/).
 *
 * Rules (docs/business-rules.md → "Inquiry reference attribution — proposed"):
 * - A click ID is never shown to the customer and never put in the WhatsApp prefill. It is held
 *   in the tab session and sent only first-party to the site's own `/api/inquiry-ref`.
 * - The customer sees only a short, random, non-sequential reference, e.g. `G-7K3M9P`.
 * - A click ID or a reference is not a lead. It only lets Sales join an inquiry that was actually
 *   sent to the paid click that started the session.
 */

/** Google Ads click identifiers, in priority order (first present wins). */
export const CLICK_ID_KEYS = ["gclid", "gbraid", "wbraid"] as const;
export type ClickIdKey = (typeof CLICK_ID_KEYS)[number];

export interface PaidClick {
  readonly type: ClickIdKey;
  readonly value: string;
}

/** URL-safe opaque token; the cap keeps a hostile URL from bloating storage or the log. */
const CLICK_ID_VALUE = /^[A-Za-z0-9_-]{8,200}$/;

export function isClickIdKey(value: unknown): value is ClickIdKey {
  return typeof value === "string" && (CLICK_ID_KEYS as readonly string[]).includes(value);
}

export function normalizePaidClick(data: unknown): PaidClick | null {
  if (typeof data !== "object" || data === null) return null;
  const record = data as Record<string, unknown>;
  const { type, value } = record;
  if (!isClickIdKey(type) || typeof value !== "string" || !CLICK_ID_VALUE.test(value)) return null;
  return { type, value };
}

/** The first valid Google click ID in a query string, or null. Invalid values are ignored. */
export function parsePaidClick(search: string): PaidClick | null {
  const params = new URLSearchParams(search);
  for (const type of CLICK_ID_KEYS) {
    const click = normalizePaidClick({ type, value: params.get(type) });
    if (click !== null) return click;
  }
  return null;
}

/** No 0/O, 1/I/L: the reference is read and retyped by people. 31^6 ≈ 8.9·10^8 values. */
export const INQUIRY_REF_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const INQUIRY_REF_LENGTH = 6;
const INQUIRY_REF = new RegExp(`^G-[${INQUIRY_REF_ALPHABET}]{${INQUIRY_REF_LENGTH}}$`);

export function isInquiryRef(value: unknown): value is string {
  return typeof value === "string" && INQUIRY_REF.test(value);
}

/**
 * A fresh random reference from a cryptographic source. Rejection sampling keeps every symbol
 * equally likely (256 is not a multiple of 31).
 */
export function createInquiryRef(randomBytes: (n: number) => Uint8Array = cryptoBytes): string {
  const limit = 256 - (256 % INQUIRY_REF_ALPHABET.length);
  let out = "";
  while (out.length < INQUIRY_REF_LENGTH) {
    for (const byte of randomBytes(INQUIRY_REF_LENGTH * 2)) {
      if (byte < limit && out.length < INQUIRY_REF_LENGTH) {
        out += INQUIRY_REF_ALPHABET[byte % INQUIRY_REF_ALPHABET.length];
      }
    }
  }
  return `G-${out}`;
}

function cryptoBytes(n: number): Uint8Array {
  const bytes = new Uint8Array(n);
  crypto.getRandomValues(bytes);
  return bytes;
}
