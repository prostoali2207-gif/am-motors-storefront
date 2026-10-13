/**
 * Consent Mode v2 Google Ads website-click adapter, not a message receipt.
 * Basic mode: tag does not load before opt-in (as on current Production).
 * Advanced mode (staged on Preview): tag loads with four consent types denied
 * and may transmit Google's limited cookieless pings; no ad storage or chat
 * contents are shared without consent. Requires privacy/legal review for Production.
 *
 * https://developers.google.com/tag-platform/security/concepts/consent-mode
 */
type DataCommand = IArguments | Record<string, string>;
type MeasurementWindow = Window & { dataLayer?: DataCommand[] };

let conversionTarget: string | null = null;
let adStorageConsent: "denied" | "granted" | null = null;

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
  // Google's official gtag() adapter needs the actual Arguments object; a rest array
  // silently breaks its command protocol. This single lint exception documents that API.
  // eslint-disable-next-line prefer-rest-params -- Required by Google's gtag.js protocol.
  w.dataLayer.push(arguments);
}

/** Google tags are configured once; only `ad_storage` changes after a visitor's choice. */
export function updateGoogleAdsConsent(granted: boolean): boolean {
  if (typeof window === "undefined" || conversionTarget === null) return false;
  const next = granted ? "granted" : "denied";
  if (adStorageConsent === next) return true;
  pushGoogleCommand("consent", "update", {
    ad_storage: next, analytics_storage: "denied",
    ad_user_data: "denied", ad_personalization: "denied",
  });
  adStorageConsent = next;
  return true;
}

/**
 * `allowStorage=false` is ONLY for Advanced mode; its tag deliberately loads
 * with consent denied and sends limited cookieless measurement to Google.
 * Never treat such events as confirmed WhatsApp conversations.
 */
export function activateGoogleAdsMeasurement(
  tagId: string, label: string, allowStorage = true,
): boolean {
  if (typeof window === "undefined" || typeof document === "undefined") return false;
  if (!/^AW-[0-9]{6,15}$/.test(tagId) || !/^[a-zA-Z0-9_-]{3,128}$/.test(label)) return false;
  const target = tagId + "/" + label;
  if (conversionTarget !== null) {
    if (conversionTarget !== target) return false;
    return updateGoogleAdsConsent(allowStorage);
  }

  const w = window as MeasurementWindow;
  w.dataLayer ??= [];
  // All consent defaults MUST precede config, the script and every event.
  pushGoogleCommand("consent", "default", {
    ad_storage: "denied", analytics_storage: "denied",
    ad_user_data: "denied", ad_personalization: "denied",
  });
  adStorageConsent = "denied";
  // Redact ad click IDs from cookieless pings where Google supports it.
  pushGoogleCommand("set", "ads_data_redaction", true);
  if (allowStorage) {
    pushGoogleCommand("consent", "update", {
      ad_storage: "granted", analytics_storage: "denied",
      ad_user_data: "denied", ad_personalization: "denied",
    });
    adStorageConsent = "granted";
  }
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
  adStorageConsent = null;
}
