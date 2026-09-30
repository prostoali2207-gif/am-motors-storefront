import { describe, expect, it } from "vitest";

import { generalRequestMessage } from "@/conversion/inquiry-message";
import { LOCALES } from "@/i18n/locales";
import { MESSAGES, type Messages } from "@/i18n/messages";

function strings(messages: Messages): string[] {
  const out: string[] = [];
  const walk = (value: unknown) => {
    if (typeof value === "string") out.push(value);
    else if (typeof value === "function") out.push(String((value as (...a: unknown[]) => string)(3, 1, 5)));
    else if (typeof value === "object" && value !== null) Object.values(value).forEach(walk);
  };
  walk(messages);
  return out;
}

describe("interface messages", () => {
  it("has every string, non-empty, in every language", () => {
    const keys = JSON.stringify(Object.keys(MESSAGES.en).sort());
    for (const locale of LOCALES) {
      expect(JSON.stringify(Object.keys(MESSAGES[locale]).sort())).toBe(keys);
      for (const text of strings(MESSAGES[locale])) expect(text.trim()).not.toBe("");
    }
  });

  it("keeps the confirmed English wording", () => {
    expect(MESSAGES.en).toMatchObject({
      homeTitle: "Cars in stock",
      navCars: "Cars",
      sold: "Sold",
      soldNotice: "This car has been sold.",
      specHeading: "Specification",
      photosUnavailable: "Photos unavailable",
      chatOnWhatsApp: "Chat on WhatsApp",
      requestViewing: "Request a viewing",
      requestTestDrive: "Request a test drive",
      generalRequestTitle: "Didn't find what you need?",
    });
  });

  it("uses the language's plural rules for the car count", () => {
    expect(MESSAGES.en.availableCount(1)).toBe("1 car available");
    expect(MESSAGES.en.availableCount(1200)).toBe("1,200 cars available");
    expect(MESSAGES.ru.availableCount(1)).toBe("1 автомобиль в наличии");
    expect(MESSAGES.ru.availableCount(3)).toBe("3 автомобиля в наличии");
    expect(MESSAGES.ru.availableCount(18)).toBe("18 автомобилей в наличии");
    expect(MESSAGES.ru.availableCount(21)).toBe("21 автомобиль в наличии");
    expect(MESSAGES.ar.availableCount(1)).toBe("سيارة واحدة متوفرة");
    expect(MESSAGES.ar.availableCount(2)).toBe("سيارتان متوفرتان");
    expect(MESSAGES.ar.availableCount(3)).toBe("3 سيارات متوفرة");
    expect(MESSAGES.ar.availableCount(18)).toBe("18 سيارة متوفرة");
    expect(MESSAGES.ar.availableCount(100)).toBe("100 سيارة متوفرة");
  });

  it("uses Western digits in Arabic", () => {
    expect(MESSAGES.ar.availableCount(18)).not.toMatch(/[٠-٩]/);
  });

  it("never uses booking, reservation or promise wording in any language", () => {
    const blocked = [
      /\bbook/i,
      /\breserve/i,
      /\bconfirm/i,
      /احجز|حجز|تأكيد/,
      /брон|заброни|подтвер|резерв/i,
      /guarantee|гарант|ضمان/i,
    ];
    for (const locale of LOCALES) {
      const texts = [...strings(MESSAGES[locale]), generalRequestMessage(locale)];
      for (const text of texts) for (const pattern of blocked) expect(text).not.toMatch(pattern);
    }
  });
});
