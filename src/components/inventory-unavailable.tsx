import type { Locale } from "@/i18n/locales";
import { messages } from "@/i18n/messages";

/** Truthful state when inventory cannot be read. Never presented as "no cars". */
export function InventoryUnavailable({ locale }: { locale: Locale }) {
  const t = messages(locale);
  return (
    <section className="notice" role="status" aria-labelledby="inventory-unavailable-heading">
      <h2 className="notice-title" id="inventory-unavailable-heading">
        {t.unavailableTitle}
      </h2>
      <p>{t.unavailableText}</p>
    </section>
  );
}
