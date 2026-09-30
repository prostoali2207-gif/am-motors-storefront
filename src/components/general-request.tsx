import { WhatsAppLink } from "./whatsapp-link";

/**
 * General-request inquiry: "Didn't find what you need?" → WhatsApp with the confirmed neutral
 * message. Placed where browsing ends. Promises nothing — no sourcing, import or availability.
 */
export function GeneralRequest() {
  return (
    <section className="general-request" aria-labelledby="general-request-heading">
      <h2 id="general-request-heading" className="general-request-title">
        Didn&apos;t find what you need?
      </h2>
      <p className="general-request-text">Ask us about current availability on WhatsApp.</p>
      <WhatsAppLink className="action action-secondary general-request-action" inquiry={{ kind: "general" }} serverOrigin={null}>
        Chat on WhatsApp
      </WhatsAppLink>
    </section>
  );
}
