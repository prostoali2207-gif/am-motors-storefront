import Link from "next/link";

import { localizedPath, type Locale } from "@/i18n/locales";
import { messages } from "@/i18n/messages";

export function vehicleNotFound(locale: Locale) {
  return function VehicleNotFound() {
    const t = messages(locale);
    return (
      <section className="status-page">
        <h1 className="page-title">{t.carNotFoundTitle}</h1>
        <p>{t.carNotFoundText}</p>
        <p>
          <Link className="text-link" href={localizedPath(locale, { kind: "cars" })}>
            {t.seeCarsInStock}
          </Link>
        </p>
      </section>
    );
  };
}

export function pageNotFound(locale: Locale) {
  return function NotFound() {
    const t = messages(locale);
    return (
      <section className="status-page">
        <h1 className="page-title">{t.pageNotFoundTitle}</h1>
        <p>{t.pageNotFoundText}</p>
        <p>
          <Link className="text-link" href={localizedPath(locale, { kind: "cars" })}>
            {t.seeCarsInStock}
          </Link>
        </p>
      </section>
    );
  };
}
