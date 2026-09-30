import { act, cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { resetAttributionMemoryForTests } from "@/attribution/session-attribution";
import { GeneralRequest } from "@/components/general-request";
import { InventoryList } from "@/components/inventory-list";
import { VehicleDetail } from "@/components/vehicle-detail";
import type { Vehicle } from "@/domain/vehicle";
import { syntheticAvailable, syntheticSold } from "../fixtures/vehicles";

const TITLE = "2001 Testmake Fixture Alpha Synthetic Trim";

function text(link: HTMLElement): string {
  const url = new URL(link.getAttribute("href") ?? "");
  expect(url.origin).toBe("https://wa.me");
  expect(url.pathname).toBe("/971503432337");
  return url.searchParams.get("text") ?? "";
}

function zone() {
  return screen.getByRole("region", { name: "Ask about this car" });
}

function stickyBar(container: HTMLElement): HTMLElement {
  const bar = container.querySelector<HTMLElement>("[data-sticky-actions]");
  if (bar === null) throw new Error("no sticky bar");
  return bar;
}

beforeEach(() => {
  window.sessionStorage.clear();
  resetAttributionMemoryForTests();
  window.history.pushState({}, "", "/cars/TEST-0001");
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("available VDP actions", () => {
  it("has exactly three in-page actions: WhatsApp primary, viewing and test drive secondary", () => {
    render(<VehicleDetail locale="en" vehicle={syntheticAvailable} serverOrigin="https://site.test" />);
    const links = within(zone()).getAllByRole("link");
    expect(links.map((a) => a.textContent)).toEqual(["Chat on WhatsApp", "Request a viewing", "Request a test drive"]);
    expect(links[0]?.className).toContain("action-primary");
    expect(links[1]?.className).toContain("action-secondary");
    expect(links[2]?.className).toContain("action-secondary");
  });

  it("prefills each action with its own message, the public title, ID and the current VDP URL", () => {
    render(<VehicleDetail locale="en" vehicle={syntheticAvailable} serverOrigin="https://site.test" />);
    const [question, viewing, testDrive] = within(zone()).getAllByRole("link").map(text);
    // After hydration the page's actual origin (jsdom: http://localhost:3000) replaces the server one.
    const url = `${window.location.origin}/cars/TEST-0001`;
    expect(question).toBe(`Hi, I'm interested in ${TITLE} (Ref: TEST-0001).\n${url}`);
    expect(viewing).toBe(`Hi, I'd like to request a viewing for ${TITLE} (Ref: TEST-0001).\n${url}`);
    expect(testDrive).toBe(`Hi, I'd like to request a test drive for ${TITLE} (Ref: TEST-0001).\n${url}`);
  });

  it("opens WhatsApp safely in a new context and describes what happens", () => {
    render(<VehicleDetail locale="en" vehicle={syntheticAvailable} serverOrigin="https://site.test" />);
    for (const link of within(zone()).getAllByRole("link")) {
      expect(link.getAttribute("target")).toBe("_blank");
      expect(link.getAttribute("rel")).toBe("noopener noreferrer");
      expect(link.getAttribute("aria-describedby")).toBe("vehicle-actions-hint");
    }
    expect(screen.getByText("Opens WhatsApp with a message about this car.").id).toBe("vehicle-actions-hint");
  });

  it("appends first-touch attribution from the landing URL, only the values received", () => {
    window.history.pushState({}, "", "/cars/TEST-0001?utm_source=instagram&utm_campaign=yaris_reel&utm_content=reel_a");
    render(<VehicleDetail locale="en" vehicle={syntheticAvailable} serverOrigin="https://site.test" />);
    const viewing = text(within(zone()).getByRole("link", { name: "Request a viewing" }));
    expect(viewing).toBe(
      `Hi, I'd like to request a viewing for ${TITLE} (Ref: TEST-0001).\n` +
        `${window.location.origin}/cars/TEST-0001\n\nSource: instagram\nCampaign: yaris_reel\nContent: reel_a`,
    );
    // The URL line is the clean VDP URL — the ad parameters are not repeated in it.
    expect(viewing.split("\n")[1]).not.toContain("?");
  });

  it("keeps the attribution after internal navigation and refreshes the link at click time", () => {
    window.history.pushState({}, "", "/?utm_source=tiktok&utm_medium=paid_social&fbclid=IwAR0synthetic");
    render(<GeneralRequest locale="en" />);
    cleanup();
    window.history.pushState({}, "", "/cars/TEST-0001");
    render(<VehicleDetail locale="en" vehicle={syntheticAvailable} serverOrigin="https://site.test" />);
    const link = within(zone()).getByRole("link", { name: "Request a test drive" });
    link.addEventListener("click", (event) => event.preventDefault());
    act(() => link.click());
    expect(text(link)).toMatch(/\n\nSource: tiktok\nMedium: paid_social$/);
    expect(text(link)).not.toMatch(/fbclid|IwAR0synthetic/);
  });

  it("adds no attribution block when none was received", () => {
    render(<VehicleDetail locale="en" vehicle={syntheticAvailable} serverOrigin="https://site.test" />);
    for (const link of within(zone()).getAllByRole("link")) {
      expect(text(link)).not.toMatch(/Source|Medium|Campaign|Content|Term|fbclid/);
    }
  });

  it("has a sticky bar with at most two actions (WhatsApp + test drive), hidden until the zone scrolls away", () => {
    let callback: IntersectionObserverCallback = () => {};
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(cb: IntersectionObserverCallback) {
          callback = cb;
        }
        observe() {}
        disconnect() {}
      },
    );
    const { container } = render(<VehicleDetail locale="en" vehicle={syntheticAvailable} serverOrigin="https://site.test" />);
    const bar = stickyBar(container);
    expect(bar.hidden).toBe(true);
    const links = within(bar).getAllByRole("link", { hidden: true });
    expect(links.map((a) => a.textContent)).toEqual(["Chat on WhatsApp", "Request a test drive"]);
    expect(text(links[1] as HTMLElement)).toContain("request a test drive for");

    const fire = (isIntersecting: boolean, bottom: number) =>
      act(() =>
        callback(
          [{ isIntersecting, boundingClientRect: { bottom } } as IntersectionObserverEntry],
          {} as IntersectionObserver,
        ),
      );
    fire(false, -10); // zone scrolled above the viewport
    expect(bar.hidden).toBe(false);
    fire(true, 100); // back in view
    expect(bar.hidden).toBe(true);
    fire(false, 2000); // below the viewport (not reached yet)
    expect(bar.hidden).toBe(true);
  });
});

describe("sticky bar never covers content", () => {
  it("publishes its measured height as the page's reserved bottom padding and clears it on unmount", () => {
    let resize: () => void = () => {};
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(cb: () => void) {
          resize = cb;
        }
        observe() {}
        disconnect() {}
      },
    );
    const { container, unmount } = render(<VehicleDetail locale="en" vehicle={syntheticAvailable} serverOrigin="https://site.test" />);
    const bar = stickyBar(container);
    vi.spyOn(bar, "getBoundingClientRect").mockReturnValue({ height: 74.2 } as DOMRect);
    act(() => resize());
    expect(document.documentElement.style.getPropertyValue("--sticky-actions-height")).toBe("75px");
    // Hidden again (height 0): the last value is kept, so the page does not jump.
    vi.spyOn(bar, "getBoundingClientRect").mockReturnValue({ height: 0 } as DOMRect);
    act(() => resize());
    expect(document.documentElement.style.getPropertyValue("--sticky-actions-height")).toBe("75px");
    unmount();
    expect(document.documentElement.style.getPropertyValue("--sticky-actions-height")).toBe("");
  });
});

describe("sold VDP", () => {
  it("has zero conversion actions and no sticky bar", () => {
    const { container } = render(<VehicleDetail locale="en" vehicle={syntheticSold} serverOrigin="https://site.test" />);
    expect(container.querySelectorAll("a[href*='wa.me'], [data-inquiry]")).toHaveLength(0);
    expect(container.querySelector("[data-sticky-actions]")).toBeNull();
    expect(screen.queryByRole("region", { name: "Ask about this car" })).toBeNull();
  });
});

describe("general request", () => {
  it("uses the confirmed heading and neutral message", () => {
    render(<GeneralRequest locale="en" />);
    const section = screen.getByRole("region", { name: "Didn't find what you need?" });
    const link = within(section).getByRole("link", { name: "Chat on WhatsApp" });
    expect(text(link)).toBe(
      "Hi, I couldn't find the car I'm looking for on the website. Can you help me with current availability?",
    );
    expect(section.textContent).not.toMatch(/source|import|we('ll| will) find|guarantee|order/i);
  });

  it("is a separate inquiry from the list and never offers vehicle actions", () => {
    render(
      <>
        <InventoryList locale="en" result={{ kind: "empty" }} headingLevel={2} />
        <GeneralRequest locale="en" />
      </>,
    );
    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(screen.queryByText(/request a (viewing|test drive)/i)).toBeNull();
  });
});

describe("copy and data guards on rendered actions", () => {
  it("never says Book, Reserve or Confirm", () => {
    const { container } = render(
      <>
        <VehicleDetail locale="en" vehicle={syntheticAvailable} serverOrigin="https://site.test" />
        <GeneralRequest locale="en" />
      </>,
    );
    const hrefs = [...container.querySelectorAll("a")].map((a) => decodeURIComponent(a.getAttribute("href") ?? ""));
    for (const content of [container.textContent ?? "", ...hrefs]) {
      expect(content).not.toMatch(/\b(book|booking|booked|reserve|reserved|reservation|confirm|confirmed)\b/i);
      expect(content).not.toMatch(/qualified lead/i);
    }
  });

  it("puts no price, private field or internal value into any WhatsApp link", () => {
    const leaky = {
      ...syntheticAvailable,
      vin: "PRIVATE-VIN-MARKER",
      minPriceAed: 99999,
      notes: "PRIVATE-NOTES-MARKER",
      mediaLink: "PRIVATE-MEDIA-LINK-MARKER",
    } as Vehicle;
    const { container } = render(<VehicleDetail locale="en" vehicle={leaky} serverOrigin="https://site.test" />);
    const hrefs = [...container.querySelectorAll("a[href*='wa.me']")].map((a) =>
      decodeURIComponent(a.getAttribute("href") ?? ""),
    );
    expect(hrefs.length).toBe(5); // 3 in-page + 2 sticky
    for (const href of hrefs) {
      expect(href).not.toMatch(/PRIVATE-|99,?999|11,?111|AED|22,?222|Test gearbox|Test spec/);
    }
    expect(container.innerHTML).not.toMatch(/PRIVATE-|99,?999/);
  });
});
