import Link from "next/link";
import { localizedPath, type Locale } from "@/i18n/locales";
import { messages } from "@/i18n/messages";

/** Secondary seller entry after the inventory and buyer inquiry path. */
export function SellCarPrompt({ locale }: { locale: Locale }) {
  const t = messages(locale);
  return (
    <section className="sell-car-prompt" aria-labelledby="sell-car-prompt-heading">
      <div>
        <h2 id="sell-car-prompt-heading">{t.sellPromptTitle}</h2>
        <p>{t.sellPromptText}</p>
      </div>
      <Link href={localizedPath(locale, { kind: "sell" })}>{t.sellPromptLink} ↗</Link>
    </section>
  );
}
