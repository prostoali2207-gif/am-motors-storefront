"use client";

import { usePathname } from "next/navigation";

import { languageSelectionHref } from "@/i18n/locale-preference";
import { LOCALE_CONFIG, LOCALES, type Locale } from "@/i18n/locales";
import { messages } from "@/i18n/messages";

/**
 * EN · العربية · RU — same page and same vehicle ID in every language.
 * Plain links work without JavaScript. A one-time URL marker tells the proxy
 * to remember the visitor's manual selection and redirect to the clean URL.
 * A full navigation is required because locales use separate root layouts.
 */
export function LanguageSwitcher({ locale }: { locale: Locale }) {
  const pathname = usePathname() ?? "/";
  return (
    <nav className="language-switcher" aria-label={messages(locale).languageNavLabel}>
      <ul>
        {LOCALES.map((target) => {
          const config = LOCALE_CONFIG[target];
          const current = target === locale;
          return (
            <li key={target}>
              <a
                href={languageSelectionHref(pathname, target)}
                hrefLang={config.lang}
                lang={config.lang}
                aria-current={current ? "true" : undefined}
              >
                {config.switcherLabel}
                {config.switcherLabel === config.name ? null : <span className="visually-hidden"> {config.name}</span>}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
