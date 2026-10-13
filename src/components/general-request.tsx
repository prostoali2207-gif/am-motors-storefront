import type { Locale } from "@/i18n/locales";
import { messages } from "@/i18n/messages";
import { WhatsAppLink } from "./whatsapp-link";

/**
 * A single low-emphasis link after inventory, including empty and unavailable states.
 * Retains the same neutral general-request WhatsApp inquiry and first-touch attribution.
 */
export function GeneralRequest({ locale }: { locale: Locale }) {
  const t = messages(locale);
  return (
    <div className="general-request">
      <WhatsAppLink
        className="general-request-link"
        inquiry={{ kind: "general", locale }}
        serverOrigin={null}
      >
        {t.generalRequestTitle} {t.generalRequestText} <span aria-hidden="true">↗</span>
      </WhatsAppLink>
    </div>
  );
}
