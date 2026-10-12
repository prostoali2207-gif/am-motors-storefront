/**
 * Consent-gated Google Ads website-click conversion adapter (not a message receipt).
 * Never load third-party code before explicit opt-in. No enhanced-conversion user data,
 * purchase values, VIN, customer details or raw WhatsApp messages are transmitted.
 *
 * https://support.google.com/google-ads/answer/6331304
 */
type DataCommand = readonly unknown[] | Record<string, string>;
type MeasurementWindow = Window & { dataLayer?: DataCommand[] };

let conversionTarget: string | null = null;

export const ADS_CONSENT_STORAGE_KEY = "am-motors:ads-consent:v1";

export function activateGoogleAdsMeasurement(tagId: string, label: string): boolean {
  if (typeof window === "undefined" || typeof document === "undefined") return false;
  if (!/^AW-[0-9]{6,15}$/.test(tagId) || !/^[a-zA-Z0-9_-]{3,128}$/.test(label)) return false;
  const target = tagId + "/" + label;
  if (conversionTarget === target) return true;

  const w = window as MeasurementWindow;
  w.dataLayer ??= [];
  // Basic consent mode: nothing is loaded until opt-in; never enable personalization.
  w.dataLayer.push(["consent", "default", {
    ad_storage: "denied", analytics_storage: "denied",
    ad_user_data: "denied", ad_personalization: "denied",
  }]);
  w.dataLayer.push(["consent", "update", { ad_storage: "granted" }]);
  w.dataLayer.push(["js", new Date()]);
  w.dataLayer.push(["config", tagId, {
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
  }]);

  const script = document.createElement("script");
  script.async = true;
  script.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(tagId);
  const nonce = document.querySelector<HTMLScriptElement>("script[nonce]")?.nonce;
  if (nonce) script.nonce = nonce;
  document.head.appendChild(script);
  conversionTarget = target;
  return true;
}

export function reportGoogleAdsWhatsAppClick(): boolean {
  if (typeof window === "undefined" || conversionTarget === null) return false;
  const w = window as MeasurementWindow;
  w.dataLayer ??= [];
  w.dataLayer.push(["event", "conversion", { send_to: conversionTarget }]);
  return true;
}

/** Tests only: never invokes network operations. */
export function resetGoogleAdsMeasurementForTests() {
  conversionTarget = null;
}
