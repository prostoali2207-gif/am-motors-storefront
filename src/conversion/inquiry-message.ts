import { formatAttributionBlock, type Attribution } from "@/attribution/attribution";

/**
 * WhatsApp prefill templates — Confirmed 2026-09-30 (docs/business-rules.md → "Contact and
 * inquiries"). Every message is an inquiry (lead candidate) — it schedules and holds nothing;
 * qualification happens downstream in Sales / Lead Conversion.
 *
 * Vehicle messages use only the public title, the public ID and the VDP URL — no price, status,
 * condition or any other fact (a price can change between page view and message).
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
      /** Site path of the VDP (`vehiclePath(id)`); combined with the page origin. */
      readonly path: string;
    }
  | { readonly kind: "general" };

export const GENERAL_REQUEST_MESSAGE =
  "Hi, I couldn't find the car I'm looking for on the website. Can you help me with current availability?";

function vehicleOpening(intent: VehicleInquiryIntent, title: string, id: string): string {
  switch (intent) {
    case "question":
      return `Hi, I'm interested in ${title} (Ref: ${id}).`;
    case "viewing":
      return `Hi, I'd like to request a viewing for ${title} (Ref: ${id}).`;
    case "test-drive":
      return `Hi, I'd like to request a test drive for ${title} (Ref: ${id}).`;
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
    lines.push(vehicleOpening(inquiry.intent, inquiry.title, inquiry.id));
    if (origin !== null) lines.push(`${origin}${inquiry.path}`);
  } else {
    lines.push(GENERAL_REQUEST_MESSAGE);
  }

  const block = formatAttributionBlock(attribution);
  return block === "" ? lines.join("\n") : `${lines.join("\n")}\n\n${block}`;
}
