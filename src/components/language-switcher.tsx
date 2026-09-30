"use client";

import { usePathname } from "next/navigation";

import { LOCALE_CONFIG, LOCALES, switchLocalePath, type Locale } from "@/i18n/locales";
import { messages } from "@/i18n/messages";

/**
 * EN · العربية · RU — plain links to the same page in each language (homepage → homepage,
 * /cars → /cars, a VDP → the same vehicle ID). No flags, no automatic redirect. The href is
 * computed from the current path during server rendering too, so it works without JavaScript.
 *
 * Plain <a> (not next/link): each language has its own root layout (<html lang dir>), so the
 * switch is a full document load either way.
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
                href={switchLocalePath(pathname, target)}
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
