/**
 * The AM Motors WhatsApp business number — Confirmed 2026-09-30 (docs/business-rules.md →
 * "Contact and inquiries"). Public business information, not a secret. This is the only place the
 * number exists in the code: every WhatsApp link is built by `whatsAppUrl`.
 */
export const WHATSAPP_BUSINESS_NUMBER = {
  /** Human-readable form. */
  display: "+971 50 343 2337",
  /** Canonical wa.me digits (country code, no "+", no spaces). */
  digits: "971503432337",
} as const;

/**
 * `https://wa.me/<digits>?text=<message>`. The message is percent-encoded with
 * `encodeURIComponent` (spaces → %20, new lines → %0A, "&", "#", "?" escaped), so no part of the
 * text can change the host, path or add parameters. Nothing is sent anywhere until the visitor
 * opens the link and presses send in WhatsApp.
 */
export function whatsAppUrl(message: string): string {
  return `https://wa.me/${WHATSAPP_BUSINESS_NUMBER.digits}?text=${encodeURIComponent(message)}`;
}
