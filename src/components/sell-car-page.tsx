import Link from "next/link";
import { localizedPath, type Locale } from "@/i18n/locales";
import { messages } from "@/i18n/messages";
import { WhatsAppLink } from "./whatsapp-link";

/** Seller-only landing with no automatic valuation or unconfirmed buyer-side claims. */
export function SellCarPage({ locale }: { locale: Locale }) {
  const t = messages(locale);
  return (
    <article className="sell-car-page">
      <header>
        <p className="sell-car-eyebrow">{t.sellEyebrow}</p>
        <h1>{t.sellTitle}</h1>
        <p className="sell-car-description">{t.sellDescription}</p>
      </header>
      <div className="sell-car-info">
        <section className="sell-car-detail" aria-labelledby="sell-car-details-heading">
          <h2 id="sell-car-details-heading">{t.sellDetailsTitle}</h2>
          <p>{t.sellDetailsText}</p>
        </section>
        <div className="sell-car-contact">
          <WhatsAppLink className="sell-car-cta" inquiry={{ kind: "sell", locale }} serverOrigin={null}>
            {t.sellCta} ↗
          </WhatsAppLink>
          <p>{t.sellHint}</p>
        </div>
      </div>
      <Link className="sell-car-back" href={localizedPath(locale, { kind: "cars" })}>
        ← {t.seeCarsInStock}
      </Link>
    </article>
  );
}
