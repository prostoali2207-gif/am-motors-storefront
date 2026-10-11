import { normalizeAttribution, type Attribution } from "@/attribution/attribution";
import { isInquiryRef, normalizePaidClick, type PaidClick } from "@/attribution/paid-click";
import { isUsableVehicleId } from "@/domain/vehicle-id";
import { LOCALES, type Locale } from "@/i18n/locales";

/**
 * The record of one WhatsApp handoff (issue #19). Shared by the browser (which builds it) and the
 * server (which re-validates it from untrusted input). Pure — no storage, no network.
 *
 * `handoff_initiated` is the ONLY event the site can observe: the visitor opened WhatsApp with a
 * prefilled message. It is NOT an inquiry, NOT a lead: the visitor may never press Send. Whether
 * a message actually arrived, and everything after it, is recorded by Sales (docs/inquiry-attribution.md).
 */

export const HANDOFF_INTENTS = ["question", "viewing", "test-drive", "general"] as const;
export type HandoffIntent = (typeof HANDOFF_INTENTS)[number];

export interface Handoff {
  readonly ref: string;
  readonly click: PaidClick;
  /** Public vehicle ID verbatim, or null for the general request. */
  readonly vehicleId: string | null;
  readonly intent: HandoffIntent;
  readonly locale: Locale;
  readonly utm: Attribution;
}

/** Hard cap on the request body; a valid handoff is far smaller. */
export const MAX_HANDOFF_BYTES = 2048;
/** Public IDs are short; this only stops abuse (the server also checks the ID exists). */
const MAX_VEHICLE_ID_LENGTH = 64;

export function parseHandoff(data: unknown): Handoff | null {
  if (typeof data !== "object" || data === null || Array.isArray(data)) return null;
  const record = data as Record<string, unknown>;

  if (!isInquiryRef(record.ref)) return null;
  const click = normalizePaidClick(record.click);
  if (click === null) return null;

  const intent = record.intent;
  if (typeof intent !== "string" || !(HANDOFF_INTENTS as readonly string[]).includes(intent)) return null;
  const locale = record.locale;
  if (typeof locale !== "string" || !(LOCALES as readonly string[]).includes(locale)) return null;

  let vehicleId: string | null;
  if (intent === "general") {
    if (record.vehicleId !== null) return null;
    vehicleId = null;
  } else {
    const id = record.vehicleId;
    if (!isUsableVehicleId(id) || id.length > MAX_VEHICLE_ID_LENGTH || /\p{Cc}/u.test(id)) return null;
    vehicleId = id;
  }

  return {
    ref: record.ref,
    click,
    vehicleId,
    intent: intent as HandoffIntent,
    locale: locale as Locale,
    utm: normalizeAttribution(record.utm),
  };
}
