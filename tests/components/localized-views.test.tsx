import { act, cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { resetAttributionMemoryForTests } from "@/attribution/session-attribution";
import { GeneralRequest } from "@/components/general-request";
import { InventoryList } from "@/components/inventory-list";
import { InventoryPageHeader } from "@/components/inventory-page-header";
import { VehicleDetail } from "@/components/vehicle-detail";
import type { Vehicle } from "@/domain/vehicle";
import { LOCALES, type Locale } from "@/i18n/locales";
import { MESSAGES } from "@/i18n/messages";
import { syntheticAvailable, syntheticSold } from "../fixtures/vehicles";

/*
 * Phase 7: every language renders the same states and rules; only interface text, categorical
 * display labels, digit grouping and direction differ.
 */

const TITLE = "2001 Testmake Fixture Alpha Synthetic Trim";
const PREFIX: Record<Locale, string> = { en: "", ar: "/ar", ru: "/ru" };

/** Synthetic vehicle using the categorical values that have approved display labels. */
const mapped: Vehicle = {
  ...syntheticAvailable,
  regionalSpec: "GCC",
  transmission: "Автомат",
  fuel: "Бензин",
  drivetrain: "FWD",
};

function prefill(link: HTMLElement): string {
  const url = new URL(link.getAttribute("href") ?? "");
  expect(url.origin).toBe("https://wa.me");
  expect(url.pathname).toBe("/971503432337");
  return url.searchParams.get("text") ?? "";
}

beforeEach(() => {
  window.sessionStorage.clear();
  resetAttributionMemoryForTests();
});

afterEach(cleanup);

describe.each(LOCALES)("available VDP in %s", (locale) => {
  const t = MESSAGES[locale];

  beforeEach(() => window.history.pushState({}, "", `${PREFIX[locale]}/cars/TEST-0001`));

  it("keeps the public title and ID unchanged and localizes the interface", () => {
    render(<VehicleDetail locale={locale} vehicle={mapped} serverOrigin="https://site.test" />);
    expect(screen.getByRole("heading", { level: 1, name: TITLE })).toBeDefined();
    const spec = screen.getByRole("region", { name: t.specHeading });
    expect(within(spec).getAllByRole("term").map((dt) => dt.textContent)).toEqual([
      t.spec.mileage,
      t.spec.regionalSpec,
      t.spec.transmission,
      t.spec.fuel,
      t.spec.engine,
      t.spec.drivetrain,
      t.spec.year,
      t.spec.colour,
      t.spec.reference,
    ]);
    const values = within(spec).getAllByRole("definition").map((dd) => dd.textContent);
    // Engine, year, colour and ID are never translated.
    expect(values.slice(4)).toEqual(["Test engine", expect.any(String), "2001", "Test color", "TEST-0001"]);
    expect(screen.getByText(t.photosUnavailable)).toBeDefined();
    expect(screen.getByRole("link", { name: t.allCars }).getAttribute("href")).toBe(`${PREFIX[locale]}/cars`);
  });

  it("has exactly three conversion actions with localized labels", () => {
    render(<VehicleDetail locale={locale} vehicle={mapped} serverOrigin="https://site.test" />);
    const zone = screen.getByRole("region", { name: t.actionsHeading });
    expect(within(zone).getAllByRole("link").map((a) => a.textContent)).toEqual([
      t.chatOnWhatsApp,
      t.requestViewing,
      t.requestTestDrive,
    ]);
    expect(within(zone).getByText(t.actionsHint)).toBeDefined();
  });

  it("prefills WhatsApp in the page language with the unchanged title, Ref ID and localized VDP URL — no price, no mileage", () => {
    render(<VehicleDetail locale={locale} vehicle={mapped} serverOrigin="https://site.test" />);
    const zone = screen.getByRole("region", { name: t.actionsHeading });
    const url = `${window.location.origin}${PREFIX[locale]}/cars/TEST-0001`;
    const messages = within(zone).getAllByRole("link").map(prefill);
    const expected: Record<Locale, string[]> = {
      en: [
        `Hi, I'm interested in ${TITLE} (Ref: TEST-0001).`,
        `Hi, I'd like to request a viewing for ${TITLE} (Ref: TEST-0001).`,
        `Hi, I'd like to request a test drive for ${TITLE} (Ref: TEST-0001).`,
      ],
      ar: [
        `مرحباً، أود الاستفسار عن ${TITLE} (Ref: TEST-0001).`,
        `مرحباً، أود طلب معاينة ${TITLE} (Ref: TEST-0001).`,
        `مرحباً، أود طلب تجربة قيادة ${TITLE} (Ref: TEST-0001).`,
      ],
      ru: [
        `Здравствуйте, меня интересует ${TITLE} (Ref: TEST-0001).`,
        `Здравствуйте, хочу запросить осмотр автомобиля ${TITLE} (Ref: TEST-0001).`,
        `Здравствуйте, хочу запросить тест-драйв автомобиля ${TITLE} (Ref: TEST-0001).`,
      ],
    };
    expect(messages).toEqual(expected[locale].map((line) => `${line}\n${url}`));
    for (const message of messages) {
      expect(message).not.toMatch(/11[,  ]?111|AED|درهم|22[,  ]?222|km|كم|км/);
    }
  });

  it("appends first-touch UTM exactly as in English (same labels, first touch wins)", () => {
    window.history.pushState({}, "", `${PREFIX[locale]}/cars/TEST-0001?utm_source=instagram&utm_campaign=reel_a&gclid=synthetic`);
    render(<GeneralRequest locale={locale} />);
    cleanup();
    window.history.pushState({}, "", `${PREFIX[locale]}/cars/TEST-0001?utm_source=later_touch`);
    render(<VehicleDetail locale={locale} vehicle={mapped} serverOrigin="https://site.test" />);
    const link = within(screen.getByRole("region", { name: t.actionsHeading })).getByRole("link", { name: t.requestTestDrive });
    link.addEventListener("click", (event) => event.preventDefault());
    act(() => link.click());
    const message = prefill(link);
    expect(message).toMatch(/\n\nSource: instagram\nCampaign: reel_a$/);
    expect(message).not.toMatch(/later_touch|gclid|synthetic/);
    // The URL line is the clean localized VDP URL.
    expect(message.split("\n")[1]).toBe(`${window.location.origin}${PREFIX[locale]}/cars/TEST-0001`);
  });

  it("publishes no private or internal field", () => {
    const withPrivate = {
      ...mapped,
      vin: "PRIVATE-VIN-MARKER",
      minPriceAed: 99999,
      notes: "PRIVATE-NOTE-MARKER",
      condition: "PRIVATE-CONDITION-MARKER",
      mediaLink: "https://drive.google.com/drive/folders/PRIVATE-FOLDER",
    } as unknown as Vehicle;
    const { container } = render(<VehicleDetail locale={locale} vehicle={withPrivate} serverOrigin="https://site.test" />);
    const html = container.innerHTML;
    expect(html).not.toMatch(/PRIVATE|99[,  ]?999|drive\.google/);
  });
});

describe.each(LOCALES)("sold VDP in %s", (locale) => {
  const t = MESSAGES[locale];

  it("shows the localized Sold state, no price and zero conversion actions", () => {
    const { container } = render(<VehicleDetail locale={locale} vehicle={syntheticSold} serverOrigin="https://site.test" />);
    expect(screen.getByText(t.sold)).toBeDefined();
    expect(screen.getByText(t.soldNotice)).toBeDefined();
    expect(container.querySelectorAll('a[href^="https://wa.me"]').length).toBe(0);
    expect(container.querySelector("[data-sticky-actions]")).toBeNull();
    expect(screen.queryByRole("region", { name: t.actionsHeading })).toBeNull();
    expect(container.textContent).not.toMatch(/AED|33[,  ]?333/);
    expect(screen.getByRole("link", { name: t.seeCarsInStock }).getAttribute("href")).toBe(`${PREFIX[locale]}/cars`);
  });
});

describe("localized categorical values", () => {
  it("shows the approved labels in each language and figures with the language's grouping", () => {
    const facts = (locale: Locale) => {
      render(<VehicleDetail locale={locale} vehicle={mapped} />);
      const heading = screen.getByRole("heading", { level: 1 }).parentElement as HTMLElement;
      const items = within(heading).getAllByRole("listitem").map((li) => li.textContent);
      cleanup();
      return items;
    };
    expect(facts("en")).toEqual(["22,222 km", "GCC", "Automatic"]);
    expect(facts("ar")).toEqual(["22,222 كم", "مواصفات خليجية", "أوتوماتيك"]);
    expect(facts("ru").map((f) => f?.replace(/[  ]/g, " "))).toEqual(["22 222 км", "GCC", "Автомат"]);
  });

  it("keeps the price figure itself unchanged in every language", () => {
    for (const locale of LOCALES) {
      render(<VehicleDetail locale={locale} vehicle={mapped} />);
      const price = document.querySelector(".vehicle-price")?.textContent?.replace(/[   ,]/g, "");
      expect(price).toBe("AED11111");
      cleanup();
    }
  });

  it("shows an unmapped value verbatim in every language", () => {
    for (const locale of LOCALES) {
      render(<VehicleDetail locale={locale} vehicle={{ ...mapped, transmission: "Механика", fuel: "Гибрид" }} />);
      expect(screen.getAllByText("Механика").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Гибрид").length).toBeGreaterThan(0);
      cleanup();
    }
  });
});

describe.each(LOCALES)("inventory in %s", (locale) => {
  const t = MESSAGES[locale];

  it("links cards to the VDP in the same language and never lists sold cars as available", () => {
    render(<InventoryList locale={locale} result={{ kind: "ok", vehicles: [mapped] }} headingLevel={2} />);
    const list = screen.getByRole("list", { name: t.availableCarsLabel });
    const link = within(list).getByRole("link", { name: TITLE });
    expect(link.getAttribute("href")).toBe(`${PREFIX[locale]}/cars/TEST-0001`);
    expect(within(list).queryByText(t.sold)).toBeNull();
  });

  it("renders localized empty and unavailable states (unavailable never looks like 'no cars')", () => {
    render(<InventoryList locale={locale} result={{ kind: "empty" }} headingLevel={2} />);
    expect(screen.getByRole("heading", { name: t.emptyTitle })).toBeDefined();
    cleanup();
    render(<InventoryList locale={locale} result={{ kind: "unavailable", reason: "source-error" }} headingLevel={2} />);
    expect(screen.getByRole("heading", { name: t.unavailableTitle })).toBeDefined();
    expect(screen.queryByText(t.emptyTitle)).toBeNull();
  });

  it("shows the localized count only when the source returned cars", () => {
    render(<InventoryPageHeader locale={locale} title={t.homeTitle} result={{ kind: "ok", vehicles: [mapped] }} />);
    expect(screen.getByText(t.availableCount(1))).toBeDefined();
    cleanup();
    const { container } = render(<InventoryPageHeader locale={locale} title={t.homeTitle} result={{ kind: "empty" }} />);
    expect(container.querySelector(".page-count")).toBeNull();
  });

  it("offers the localized general request with the localized message", () => {
    render(<GeneralRequest locale={locale} />);
    expect(screen.getByRole("heading", { name: t.generalRequestTitle })).toBeDefined();
    const expected: Record<Locale, string> = {
      en: "Hi, I couldn't find the car I'm looking for on the website. Can you help me with current availability?",
      ar: "مرحباً، لم أجد السيارة التي أبحث عنها على الموقع. هل يمكنكم مساعدتي بمعرفة السيارات المتوفرة حالياً؟",
      ru: "Здравствуйте, мне не удалось найти на сайте нужный автомобиль. Подскажите, пожалуйста, что сейчас есть в наличии?",
    };
    expect(prefill(screen.getByRole("link", { name: t.chatOnWhatsApp }))).toBe(expected[locale]);
  });
});
