"use client";

import type { Locale } from "@/i18n/locales";
import { messages } from "@/i18n/messages";

/** Error boundary body. Server error details are never shown to users. */
export function ErrorView({ locale, retry }: { locale: Locale; retry: () => void }) {
  const t = messages(locale);
  return (
    <section className="status-page" role="alert">
      <h1 className="page-title">{t.errorTitle}</h1>
      <p>{t.errorText}</p>
      <button className="button" type="button" onClick={() => retry()}>
        {t.tryAgain}
      </button>
    </section>
  );
}
