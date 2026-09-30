import type { Locale } from "@/i18n/locales";
import { messages } from "@/i18n/messages";
import { WhatsAppLink } from "./whatsapp-link";

/**
 * General-request inquiry: "Didn't find what you need?" → WhatsApp with the confirmed neutral
 * message (in the page's language). Placed where browsing ends. Promises nothing — no sourcing,
 * import or availability.
 */
export function GeneralRequest({ locale }: { locale: Locale }) {
  const t = messages(locale);
  return (
    <section className="general-request" aria-labelledby="general-request-heading">
      <h2 id="general-request-heading" className="general-request-title">
        {t.generalRequestTitle}
      </h2>
      <p className="general-request-text">{t.generalRequestText}</p>
      <WhatsAppLink
        className="action action-secondary general-request-action"
        inquiry={{ kind: "general", locale }}
        serverOrigin={null}
      >
        {t.chatOnWhatsApp}
      </WhatsAppLink>
    </section>
  );
}
