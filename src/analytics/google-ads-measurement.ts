/**
 * Consent-gated Google Ads website-click conversion adapter (not a message receipt).
 * Never load third-party code before explicit opt-in. No enhanced-conversion user data,
 * purchase values, VIN, customer details or raw WhatsApp messages are transmitted.
 *
 * https://support.google.com/google-ads/answer/6331304
 */
type DataCommand = IArguments | Record<string, string>;
type MeasurementWindow = Window & { dataLayer?: DataCommand[] };

let conversionTarget: string | null = null;

export const ADS_CONSENT_STORAGE_KEY = "am-motors:ads-consent:v1";

/**
 * gtag.js reads commands from dataLayer as the real JavaScript `arguments`
 * object. Plain arrays look similar but are not the supported command format.
 * Keep first-party event objects unchanged (recordWhatsAppClick).
 * Official Google snippet: function gtag(){dataLayer.push(arguments);}
 */
function pushGoogleCommand(...values: unknown[]): void {
  if (typeof window === "undefined" || values.length === 0) return;
  const w = window as MeasurementWindow;
  w.dataLayer ??= [];
  w.dataLayer.push(arguments);
}

export function activateGoogleAdsMeasurement(tagId: string, label: string): boolean {
  if (typeof window === "undefined" || typeof document === "undefined") return false;
  if (!/^AW-[0-9]{6,15}$/.test(tagId) || !/^[a-zA-Z0-9_-]{3,128}$/.test(label)) return false;
  const target = tagId + "/" + label;
  if (conversionTarget === target) return true;

  const w = window as MeasurementWindow;
  w.dataLayer ??= [];
  // Basic consent mode: nothing is loaded until opt-in; never enable personalization.
  pushGoogleCommand("consent", "default", {
    ad_storage: "denied", analytics_storage: "denied",
    ad_user_data: "denied", ad_personalization: "denied",
  });
  pushGoogleCommand("consent", "update", { ad_storage: "granted" });
  pushGoogleCommand("js", new Date());
  pushGoogleCommand("config", tagId, {
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
  });

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
  pushGoogleCommand("event", "conversion", { send_to: conversionTarget });
  return true;
}

/** Tests only: never invokes network operations. */
export function resetGoogleAdsMeasurementForTests() {
  conversionTarget = null;
}
