import type { Attribution } from "./attribution";
import type { PaidSession } from "./session-attribution";
import { markHandoffOnce } from "./session-attribution";
import type { HandoffIntent } from "@/inquiry-log/handoff";
import type { Locale } from "@/i18n/locales";

/** First-party endpoint only (CSP `connect-src 'self'`). */
export const INQUIRY_REF_ENDPOINT = "/api/inquiry-ref";

/**
 * Tells the site's own server that this tab opened WhatsApp with reference `paid.ref`
 * (issue #19). Fire-and-forget: `sendBeacon` survives the page losing focus to WhatsApp, and the
 * link never waits for it. If it fails, the customer still gets a normal WhatsApp message and the
 * click simply stays unattributed ("unknown") — never guessed.
 *
 * `text/plain` keeps the beacon a simple request; the server parses it as JSON.
 */
export function sendHandoffBeacon(input: {
  readonly paid: PaidSession;
  readonly vehicleId: string | null;
  readonly intent: HandoffIntent;
  readonly locale: Locale;
  readonly utm: Attribution;
}): void {
  const key = `${input.paid.ref}|${input.intent}|${input.vehicleId ?? ""}`;
  if (!markHandoffOnce(key)) return;

  const body = JSON.stringify({
    ref: input.paid.ref,
    click: input.paid.click,
    vehicleId: input.vehicleId,
    intent: input.intent,
    locale: input.locale,
    utm: input.utm,
  });
  try {
    const blob = new Blob([body], { type: "text/plain;charset=UTF-8" });
    if (typeof navigator.sendBeacon === "function" && navigator.sendBeacon(INQUIRY_REF_ENDPOINT, blob)) return;
    void fetch(INQUIRY_REF_ENDPOINT, {
      method: "POST",
      body: blob,
      keepalive: true,
      credentials: "same-origin",
    }).catch(() => undefined);
  } catch {
    // Never block or break the WhatsApp link.
  }
}
