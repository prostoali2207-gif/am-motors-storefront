import type { Attribution } from "./attribution";
import { setHandoffReported, type PaidHandoff } from "./session-attribution";
import type { HandoffIntent } from "@/inquiry-log/handoff";
import type { Locale } from "@/i18n/locales";

/** First-party endpoint only (CSP `connect-src 'self'`). */
export const INQUIRY_REF_ENDPOINT = "/api/inquiry-ref";

/**
 * Tells the site's own server that this tab opened WhatsApp for one action with reference
 * `handoff.ref` (issue #19). Fire-and-forget: the link never waits for it, and WhatsApp works the
 * same whether or not the record arrives. A lost record leaves that reference unmatched
 * ("unknown") — never guessed.
 *
 * Delivery state (per action, in the tab session):
 * - already reported → nothing is sent again (repeated taps add no rows);
 * - `sendBeacon` queued it → reported;
 * - otherwise `fetch` with keepalive: reported only on a 2xx answer; on failure the state is
 *   reset, so the next tap on that action retries with the SAME reference (idempotent by ref).
 *
 * `text/plain` keeps the request simple; the server parses it as JSON.
 */
export function sendHandoffBeacon(input: {
  readonly key: string;
  readonly handoff: PaidHandoff;
  readonly vehicleId: string | null;
  readonly intent: HandoffIntent;
  readonly locale: Locale;
  readonly utm: Attribution;
}): void {
  if (input.handoff.reported) return;

  const body = JSON.stringify({
    ref: input.handoff.ref,
    click: input.handoff.click,
    vehicleId: input.vehicleId,
    intent: input.intent,
    locale: input.locale,
    utm: input.utm,
  });
  try {
    const blob = new Blob([body], { type: "text/plain;charset=UTF-8" });
    if (typeof navigator.sendBeacon === "function" && navigator.sendBeacon(INQUIRY_REF_ENDPOINT, blob)) {
      setHandoffReported(input.key, true);
      return;
    }
    // Mark first so a second tap during the request does not send a duplicate.
    setHandoffReported(input.key, true);
    void fetch(INQUIRY_REF_ENDPOINT, { method: "POST", body: blob, keepalive: true, credentials: "same-origin" })
      .then((response) => {
        if (!response.ok) setHandoffReported(input.key, false);
      })
      .catch(() => setHandoffReported(input.key, false));
  } catch {
    // Never block or break the WhatsApp link.
    setHandoffReported(input.key, false);
  }
}
