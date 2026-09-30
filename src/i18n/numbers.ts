import type { Locale } from "./locales";

/**
 * Digit grouping per language — display formatting only; the number itself is never changed.
 * Western (Latin) digits everywhere, including Arabic (observed on UAE Arabic car sites,
 * docs/ux-benchmark.md → Phase 7). Russian groups thousands with a space, because "48,000" reads
 * as a decimal in Russian. AED formatting rules remain an open question (docs/business-rules.md).
 */
const NUMBER_LOCALES: Readonly<Record<Locale, string>> = {
  en: "en-US",
  ar: "ar-AE-u-nu-latn",
  ru: "ru-RU",
};

const formats = new Map<Locale, Intl.NumberFormat>();

export function formatNumber(value: number, locale: Locale): string {
  let format = formats.get(locale);
  if (format === undefined) {
    format = new Intl.NumberFormat(NUMBER_LOCALES[locale], { maximumFractionDigits: 2 });
    formats.set(locale, format);
  }
  return format.format(value);
}
