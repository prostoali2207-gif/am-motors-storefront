import Link from "next/link";
import type { ReactNode } from "react";

import { LOCALE_CONFIG, localizedPath, type Locale } from "@/i18n/locales";
import { messages } from "@/i18n/messages";
import { AttributionCapture } from "./attribution-capture";
import { LanguageSwitcher } from "./language-switcher";

import "@/app/globals.css";
import "@/app/night-shift.css";
import "@/app/night-shift-photo-cards.css";

/**
 * The document shared by the three per-language root layouts: `<html lang dir>`, header,
 * main and footer. Arabic sets `dir="rtl"`; the layout mirrors through logical CSS properties.
 * The header stays as in Phase 4 (wordmark, "Cars") plus the compact language switcher.
 */
export function SiteDocument({
  locale,
  fontClassName,
  children,
}: {
  locale: Locale;
  fontClassName: string;
  children: ReactNode;
}) {
  const config = LOCALE_CONFIG[locale];
  const t = messages(locale);
  return (
    <html lang={config.lang} dir={config.dir} className={fontClassName}>
      <body>
        <AttributionCapture />
        <a className="skip-link" href="#main">
          {t.skipToContent}
        </a>
        <header className="site-header">
          <div className="shell site-nav">
            <nav className="site-nav-main" aria-label={t.mainNavLabel}>
              {/* Provisional text wordmark until brand assets are confirmed (open question 14). */}
              <Link className="wordmark" href={localizedPath(locale, { kind: "home" })} lang="en" dir="ltr">
                <span>AM</span><i className="ns-wordmark-bar" aria-hidden="true" /><span>MOTORS</span>
              </Link>
              <Link className="nav-link" href={localizedPath(locale, { kind: "cars" })}>
                {t.navCars}
              </Link>
            </nav>
            <LanguageSwitcher locale={locale} />
          </div>
        </header>
        <main id="main" className="shell ns-main">
          {children}
        </main>
        <footer className="site-footer">
          <div className="shell">
            <span className="wordmark" lang="en" dir="ltr">
              AM Motors
            </span>
          </div>
        </footer>
      </body>
    </html>
  );
}
