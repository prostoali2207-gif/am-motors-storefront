import { formatAttributionBlock, type Attribution } from "@/attribution/attribution";
import type { Locale } from "@/i18n/locales";

/**
 * WhatsApp prefill templates — Confirmed 2026-09-30 (docs/business-rules.md → "Contact and
 * inquiries"). Every message is an inquiry (lead candidate) — it schedules and holds nothing;
 * qualification happens downstream in Sales / Lead Conversion.
 *
 * Vehicle messages use only the public title and the VDP URL (which contains the public ID) — no price, status,
 * condition or any other fact (a price can change between page view and message).
 *
 * Phase 7: the message follows the language of the page. English is the confirmed wording;
 * Arabic and Russian translate it with the same content and restrictions. The VDP URL
 * identifies the exact car in every language, without duplicating its ID in the opening sentence. The attribution block is unchanged (English labels).
 */

/** The three vehicle-specific intents on an available VDP. */
export type VehicleInquiryIntent = "question" | "viewing" | "test-drive";

export type Inquiry =
  | {
      readonly kind: "vehicle";
      readonly intent: VehicleInquiryIntent;
      /** `vehicleTitle()` of the public model. */
      readonly title: string;
      /** Public `id`, verbatim. */
      readonly id: string;
      /** Site path of the VDP in the page's language (`localizedPath`); combined with the page origin. */
      readonly path: string;
      /** Language of the page the inquiry starts on; the message is written in it. */
      readonly locale: Locale;
    }
  | { readonly kind: "general"; readonly locale: Locale }
  | { readonly kind: "sell"; readonly locale: Locale };

interface Templates {
  readonly question: (title: string) => string;
  readonly viewing: (title: string) => string;
  readonly testDrive: (title: string) => string;
  readonly general: string;
  readonly sell: string;
}

const TEMPLATES: Readonly<Record<Locale, Templates>> = {
  en: {
    question: (title) => `Hi! I'm interested in the ${title}.`,
    viewing: (title) => `Hi, I'd like to request a viewing for ${title}.`,
    testDrive: (title) => `Hi, I'd like to request a test drive for ${title}.`,
    general: "Hi, I couldn't find the car I'm looking for on the website. Can you help me with current availability?",
    sell: "Hi! I'd like to sell my car. I can share its make, model, year, mileage and photos.",
  },
  ar: {
    question: (title) => `مرحباً، أود الاستفسار عن ${title}.`,
    viewing: (title) => `مرحباً، أود طلب معاينة ${title}.`,
    testDrive: (title) => `مرحباً، أود طلب تجربة قيادة ${title}.`,
    general: "مرحباً، لم أجد السيارة التي أبحث عنها على الموقع. هل يمكنكم مساعدتي بمعرفة السيارات المتوفرة حالياً؟",
    sell: "مرحباً، أود بيع سيارتي. يمكنني إرسال الماركة والموديل وسنة الصنع والمسافة المقطوعة والصور.",
  },
  ru: {
    question: (title) => `Здравствуйте, меня интересует ${title}.`,
    viewing: (title) => `Здравствуйте, хочу запросить осмотр автомобиля ${title}.`,
    testDrive: (title) => `Здравствуйте, хочу запросить тест-драйв автомобиля ${title}.`,
    general: "Здравствуйте, мне не удалось найти на сайте нужный автомобиль. Подскажите, пожалуйста, что сейчас есть в наличии?",
    sell: "Здравствуйте! Хочу продать автомобиль. Могу отправить марку, модель, год, пробег и фотографии.",
  },
};

/** The confirmed English general-request message. */
export const GENERAL_REQUEST_MESSAGE = TEMPLATES.en.general;

export function generalRequestMessage(locale: Locale): string {
  return TEMPLATES[locale].general;
}

function vehicleOpening(locale: Locale, intent: VehicleInquiryIntent, title: string): string {
  const templates = TEMPLATES[locale];
  switch (intent) {
    case "question":
      return templates.question(title);
    case "viewing":
      return templates.viewing(title);
    case "test-drive":
      return templates.testDrive(title);
    default: {
      const unhandled: never = intent;
      return unhandled;
    }
  }
}

/**
 * The full prefill. `origin` is the page's own origin (e.g. `https://example.com`); when it is not
 * known the URL line is left out rather than guessed. The attribution block is appended only when
 * the session actually received attribution parameters.
 */
export function inquiryMessage(inquiry: Inquiry, origin: string | null, attribution: Attribution = {}): string {
  const lines: string[] = [];
  if (inquiry.kind === "vehicle") {
    lines.push(vehicleOpening(inquiry.locale, inquiry.intent, inquiry.title));
    if (origin !== null) lines.push("", `${origin}${inquiry.path}`);
  } else if (inquiry.kind === "sell") {
    lines.push(TEMPLATES[inquiry.locale].sell);
  } else {
    lines.push(generalRequestMessage(inquiry.locale));
  }

  const block = formatAttributionBlock(attribution);
  return block === "" ? lines.join("\n") : `${lines.join("\n")}\n\n${block}`;
}
