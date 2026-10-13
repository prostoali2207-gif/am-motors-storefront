/**
 * The AM Motors WhatsApp business number — Confirmed 2026-09-30 (docs/business-rules.md →
 * "Contact and inquiries"). Public business information, not a secret. This is the only place the
 * number exists in the code: every WhatsApp link is built here.
 */
export const WHATSAPP_BUSINESS_NUMBER = {
  /** Human-readable form. */
  display: "+971 50 343 2337",
  /** Canonical wa.me digits (country code, no "+", no spaces). */
  digits: "971503432337",
} as const;

/**
 * The standard WhatsApp click-to-chat URL. The prefilled text is percent-encoded so that
 * characters in the message cannot modify the destination or add URL parameters.
 */
export function whatsAppUrl(message: string): string {
  return `https://wa.me/${WHATSAPP_BUSINESS_NUMBER.digits}?text=${encodeURIComponent(message)}`;
}

/**
 * Chrome on Android supports intent: anchors with an explicit application package.
 * Force the regular WhatsApp Messenger (com.whatsapp) rather than the Business app
 * (com.whatsapp.w4b). If Messenger is unavailable Chrome opens the normal wa.me link.
 * This is called from a direct user click, not an automatic navigation.
 */
export function whatsAppMessengerIntentUrl(message: string): string {
  return `intent://send?phone=${WHATSAPP_BUSINESS_NUMBER.digits}&text=${encodeURIComponent(message)}#Intent;scheme=whatsapp;package=com.whatsapp;S.browser_fallback_url=${encodeURIComponent(whatsAppUrl(message))};end`;
}

/**
 * Use package-specific intents only where the browser supports Chrome Android intents.
 * Avoid embedded WebViews and competing browsers: they retain the normal HTTPS link.
 */
export function supportsWhatsAppMessengerIntent(userAgent: string): boolean {
  return (
    /Android/i.test(userAgent) &&
    /Chrome\/\d+/i.test(userAgent) &&
    !/(EdgA|OPR\/|SamsungBrowser|UCBrowser|FBAN|FBAV|Instagram|; wv\))/i.test(userAgent)
  );
}
