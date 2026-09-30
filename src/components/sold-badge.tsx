import type { Locale } from "@/i18n/locales";
import { messages } from "@/i18n/messages";

/** Neutral Sold chip — never styled like an availability or action colour. */
export function SoldBadge({ locale }: { locale: Locale }) {
  return <p className="badge-sold label">{messages(locale).sold}</p>;
}
