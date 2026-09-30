import { formatAttributionBlock, type Attribution } from "@/attribution/attribution";
import type { Locale } from "@/i18n/locales";

/**
 * WhatsApp prefill templates — Confirmed 2026-09-30 (docs/business-rules.md → "Contact and
 * inquiries"). Every message is an inquiry (lead candidate) — it schedules and holds nothing;
 * qualification happens downstream in Sales / Lead Conversion.
 *
 * Vehicle messages use only the public title, the public ID and the VDP URL — no price, status,
 * condition or any other fact (a price can change between page view and message).
 *
 * Phase 7: the message follows the language of the page. English is the confirmed wording;
 * Arabic and Russian translate it with the same content and restrictions. The title and the
 * "Ref: <ID>" marker are identical in every language, so Sales sees the same car reference
 * whatever language the customer wrote in. The attribution block is unchanged (English labels).
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
  | { readonly kind: "general"; readonly locale: Locale };

interface Templates {
  readonly question: (title: string, id: string) => string;
  readonly viewing: (title: string, id: string) => string;
  readonly testDrive: (title: string, id: string) => string;
  readonly general: string;
}

const TEMPLATES: Readonly<Record<Locale, Templates>> = {
  en: {
    question: (title, id) => `Hi, I'm interested in ${title} (Ref: ${id}).`,
    viewing: (title, id) => `Hi, I'd like to request a viewing for ${title} (Ref: ${id}).`,
    testDrive: (title, id) => `Hi, I'd like to request a test drive for ${title} (Ref: ${id}).`,
    general: "Hi, I couldn't find the car I'm looking for on the website. Can you help me with current availability?",
  },
  ar: {
    question: (title, id) => `مرحباً، أود الاستفسار عن ${title} (Ref: ${id}).`,
    viewing: (title, id) => `مرحباً، أود طلب معاينة ${title} (Ref: ${id}).`,
    testDrive: (title, id) => `مرحباً، أود طلب تجربة قيادة ${title} (Ref: ${id}).`,
    general: "مرحباً، لم أجد السيارة التي أبحث عنها على الموقع. هل يمكنكم مساعدتي بمعرفة السيارات المتوفرة حالياً؟",
  },
  ru: {
    question: (title, id) => `Здравствуйте, меня интересует ${title} (Ref: ${id}).`,
    viewing: (title, id) => `Здравствуйте, хочу запросить осмотр автомобиля ${title} (Ref: ${id}).`,
    testDrive: (title, id) => `Здравствуйте, хочу запросить тест-драйв автомобиля ${title} (Ref: ${id}).`,
    general: "Здравствуйте, мне не удалось найти на сайте нужный автомобиль. Подскажите, пожалуйста, что сейчас есть в наличии?",
  },
};

/** The confirmed English general-request message. */
export const GENERAL_REQUEST_MESSAGE = TEMPLATES.en.general;

export function generalRequestMessage(locale: Locale): string {
  return TEMPLATES[locale].general;
}

function vehicleOpening(locale: Locale, intent: VehicleInquiryIntent, title: string, id: string): string {
  const templates = TEMPLATES[locale];
  switch (intent) {
    case "question":
      return templates.question(title, id);
    case "viewing":
      return templates.viewing(title, id);
    case "test-drive":
      return templates.testDrive(title, id);
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
    lines.push(vehicleOpening(inquiry.locale, inquiry.intent, inquiry.title, inquiry.id));
    if (origin !== null) lines.push(`${origin}${inquiry.path}`);
  } else {
    lines.push(generalRequestMessage(inquiry.locale));
  }

  const block = formatAttributionBlock(attribution);
  return block === "" ? lines.join("\n") : `${lines.join("\n")}\n\n${block}`;
}
