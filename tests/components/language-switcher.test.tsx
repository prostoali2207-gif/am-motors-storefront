import { cleanup, render, screen, within } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

const navigation = vi.hoisted(() => ({ pathname: "/" }));
vi.mock("next/navigation", () => ({ usePathname: () => navigation.pathname }));

import { LanguageSwitcher } from "@/components/language-switcher";
import { SiteDocument } from "@/components/site-document";
import type { Locale } from "@/i18n/locales";

afterEach(cleanup);

function hrefs(locale: Locale, pathname: string) {
  navigation.pathname = pathname;
  render(<LanguageSwitcher locale={locale} />);
  const nav = screen.getByRole("navigation");
  const links = within(nav).getAllByRole("link");
  const result = links.map((a) => [a.getAttribute("lang"), a.getAttribute("href")]);
  cleanup();
  return result;
}

describe("LanguageSwitcher", () => {
  it("keeps the visitor on the same vehicle ID in every language", () => {
    const expected = [
      ["en", "/cars/TEST-0001"],
      ["ar", "/ar/cars/TEST-0001"],
      ["ru", "/ru/cars/TEST-0001"],
    ];
    expect(hrefs("en", "/cars/TEST-0001")).toEqual(expected);
    expect(hrefs("ar", "/ar/cars/TEST-0001")).toEqual(expected);
    expect(hrefs("ru", "/ru/cars/TEST-0001")).toEqual(expected);
  });

  it("maps the homepage and /cars to the same page", () => {
    expect(hrefs("ar", "/ar")).toEqual([["en", "/"], ["ar", "/ar"], ["ru", "/ru"]]);
    expect(hrefs("en", "/cars")).toEqual([["en", "/cars"], ["ar", "/ar/cars"], ["ru", "/ru/cars"]]);
  });

  it("shows EN · العربية · RU without flags and marks the current language", () => {
    navigation.pathname = "/ru/cars";
    render(<LanguageSwitcher locale="ru" />);
    const nav = screen.getByRole("navigation", { name: "Язык" });
    const links = within(nav).getAllByRole("link");
    expect(links.map((a) => a.textContent)).toEqual(["EN English", "العربية", "RU Русский"]);
    expect(links.map((a) => a.getAttribute("aria-current"))).toEqual([null, null, "true"]);
    expect(links.map((a) => a.getAttribute("hreflang"))).toEqual(["en", "ar", "ru"]);
    expect(nav.querySelector("img, svg")).toBeNull();
  });
});

describe("SiteDocument", () => {
  it.each([
    ["en", "ltr"],
    ["ar", "rtl"],
    ["ru", "ltr"],
  ] as const)("sets <html lang=%s dir=%s> and localizes the shell", (locale, dir) => {
    navigation.pathname = locale === "en" ? "/" : `/${locale}`;
    const html = renderToStaticMarkup(
      <SiteDocument locale={locale} fontClassName="font">
        <p>content</p>
      </SiteDocument>,
    );
    expect(html).toContain(`<html lang="${locale}" dir="${dir}" class="font">`);
    const home = locale === "en" ? "/" : `/${locale}`;
    const cars = locale === "en" ? "/cars" : `/${locale}/cars`;
    expect(html).toContain(`href="${home}"`);
    expect(html).toContain(`href="${cars}"`);
  });
});
