import { describe, expect, it } from "vitest";

import {
  supportsWhatsAppMessengerIntent,
  whatsAppMessengerIntentUrl,
  whatsAppUrl,
} from "../src/conversion/whatsapp";

const androidChrome =
  "Mozilla/5.0 (Linux; Android 16; SM-A566B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36";

describe("WhatsApp Messenger Android handoff", () => {
  it("targets regular WhatsApp and retains number and prefilled text", () => {
    const message = "Здравствуйте, интересует Toyota Yaris (Ref: test-vehicle-24).\nhttps://example.com/cars/test-vehicle-24?utm_source=google&x=1";
    const href = whatsAppMessengerIntentUrl(message);
    const encodedMessage = encodeURIComponent(message);

    expect(href).toContain(`intent://send?phone=971503432337&text=${encodedMessage}#Intent;`);
    expect(href).toContain(";scheme=whatsapp;package=com.whatsapp;");
    expect(href).not.toContain("com.whatsapp.w4b");
    expect(href).toContain(
      `S.browser_fallback_url=${encodeURIComponent(whatsAppUrl(message))};end`,
    );
    expect(whatsAppUrl(message)).toBe(
      `https://wa.me/971503432337?text=${encodedMessage}`,
    );
  });

  it("uses package-specific intent only on Android Chrome", () => {
    expect(supportsWhatsAppMessengerIntent(androidChrome)).toBe(true);
    expect(supportsWhatsAppMessengerIntent("Mozilla/5.0 (Windows NT 10.0) Chrome/141.0")).toBe(false);
    expect(supportsWhatsAppMessengerIntent("Mozilla/5.0 (iPhone) CriOS/141.0")).toBe(false);
    expect(supportsWhatsAppMessengerIntent("Mozilla/5.0 (Android 16) Firefox/144.0")).toBe(false);
    expect(supportsWhatsAppMessengerIntent(androidChrome + " SamsungBrowser/28.0")).toBe(false);
    expect(supportsWhatsAppMessengerIntent(androidChrome + " [FBAN/FB4A;FBAV/123]")).toBe(false);
    expect(supportsWhatsAppMessengerIntent(androidChrome.replace("Mobile Safari", "; wv) Mobile Safari"))).toBe(false);
  });
});
