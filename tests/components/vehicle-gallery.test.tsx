import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { VehicleDetail } from "@/components/vehicle-detail";
import { VehicleGallery } from "@/components/vehicle-gallery";
import type { VehicleMedia } from "@/domain/vehicle-media";
import { syntheticAvailable, syntheticSold } from "../fixtures/vehicles";

afterEach(cleanup);

const image = (n: number): VehicleMedia => ({
  id: `TESTMEDIA000000000000${n}`,
  type: "image",
  src: `/media/TEST-0001/TESTMEDIA000000000000${n}/TESTREV0000${n}`,
});

const VIDEO: VehicleMedia = { id: "TESTMEDIA0000000000009", type: "video" };
const ONE: VehicleMedia[] = [image(1)];
/** Three images with a video in between: the video is never shown or counted. */
const MANY: VehicleMedia[] = [image(1), VIDEO, image(2), image(3)];
const TITLE = "2001 Testmake Fixture Alpha";

function counter(): string {
  const visible = document.querySelector(".photo-viewer > .photo-stage .photo-counter [aria-hidden]");
  return visible?.textContent ?? "";
}

function stageImages(): HTMLElement[] {
  return within(document.querySelector(".photo-viewer > .photo-stage") as HTMLElement).getAllByRole("img");
}

function urlsOf(img: Element): string {
  return [img.getAttribute("src") ?? "", img.getAttribute("srcset") ?? ""].join(" ");
}

describe("VehicleGallery — no photos", () => {
  it("shows a neutral 'Photos unavailable' state without any placeholder image or control", () => {
    const { container } = render(<VehicleGallery locale="en" media={[]} title={TITLE} />);
    expect(screen.getByText("Photos unavailable")).toBeDefined();
    expect(container.querySelector("img, video, picture, button, dialog")).toBeNull();
    expect(container.textContent).not.toMatch(/coming soon|soon|stock|placeholder/i);
  });

  it("treats video-only media as photos unavailable and never renders or autoloads video", () => {
    const { container } = render(<VehicleGallery locale="en" media={[VIDEO]} title={TITLE} />);
    expect(screen.getByText("Photos unavailable")).toBeDefined();
    expect(container.querySelector("video, source, iframe, img, button")).toBeNull();
  });
});

describe("VehicleGallery — one photo", () => {
  it("shows the photo, opens full screen, and has no previous/next, counter or thumbnails", () => {
    const { container } = render(<VehicleGallery locale="en" media={ONE} title={TITLE} />);
    expect(screen.getAllByRole("img").map((img) => img.getAttribute("alt"))).toEqual([`${TITLE}, photo 1 of 1`]);
    expect(screen.queryByRole("button", { name: "Previous photo" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Next photo" })).toBeNull();
    expect(screen.queryByRole("list", { name: "Choose a photo" })).toBeNull();
    expect(container.querySelector(".photo-counter")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Open photos full screen/ }));
    const dialog = screen.getByRole("dialog", { name: "Photos" });
    expect(within(dialog).getByRole("button", { name: "Close photos" })).toBeDefined();
    expect(within(dialog).queryByRole("button", { name: /photo$/ })).toBeNull();
  });
});

describe("VehicleGallery — several photos", () => {
  it("renders one viewport with images only, through the site's media route, in order", () => {
    const { container } = render(<VehicleGallery locale="en" media={MANY} title={TITLE} />);
    expect(container.querySelectorAll(".photo-stage")).toHaveLength(1);
    expect(stageImages().map((img) => img.getAttribute("alt"))).toEqual([
      `${TITLE}, photo 1 of 3`,
      `${TITLE}, photo 2 of 3`,
      `${TITLE}, photo 3 of 3`,
    ]);
    expect(container.querySelector("video, source, iframe")).toBeNull();
    expect(counter()).toBe("1 / 3");
  });

  it("never sends a Drive URL or file name to the page; only /media paths", () => {
    const { container } = render(<VehicleGallery locale="en" media={MANY} title={TITLE} />);
    fireEvent.click(screen.getAllByRole("button", { name: /Open photos full screen/ })[0]);
    for (const img of container.querySelectorAll("img")) {
      expect(urlsOf(img)).toMatch(/media%2FTEST-0001|\/media\/TEST-0001/);
    }
    expect(container.innerHTML).not.toMatch(/drive\.google|googleusercontent|googleapis|\.jpe?g|\.png|\.webp/i);
  });

  it("loads the first photo eagerly with high priority and every other image lazily", () => {
    render(<VehicleGallery locale="en" media={MANY} title={TITLE} />);
    const [first, ...rest] = stageImages();
    expect(first.getAttribute("loading")).toBe("eager");
    expect(first.getAttribute("fetchpriority")).toBe("high");
    for (const img of rest) {
      expect(img.getAttribute("loading")).toBe("lazy");
      expect(img.getAttribute("fetchpriority")).toBeNull();
    }
    const thumbs = document.querySelectorAll(".photo-thumbs img");
    expect(thumbs).toHaveLength(3);
    for (const img of thumbs) expect(img.getAttribute("loading")).toBe("lazy");
  });

  it("steps with Next / Previous, wraps at the ends and updates the counter", () => {
    render(<VehicleGallery locale="en" media={MANY} title={TITLE} />);
    const next = screen.getByRole("button", { name: "Next photo" });
    const previous = screen.getByRole("button", { name: "Previous photo" });
    fireEvent.click(next);
    expect(counter()).toBe("2 / 3");
    fireEvent.click(next);
    expect(counter()).toBe("3 / 3");
    fireEvent.click(next);
    expect(counter()).toBe("1 / 3");
    fireEvent.click(previous);
    expect(counter()).toBe("3 / 3");
    expect(screen.getAllByText("Photo 3 of 3").length).toBeGreaterThan(0);
  });

  it("selects a photo directly from the thumbnail rail and marks it active", () => {
    render(<VehicleGallery locale="en" media={MANY} title={TITLE} />);
    const rail = screen.getByRole("list", { name: "Choose a photo" });
    const thumbs = within(rail).getAllByRole("button");
    expect(thumbs.map((b) => b.getAttribute("aria-label"))).toEqual(["Photo 1 of 3", "Photo 2 of 3", "Photo 3 of 3"]);
    expect(thumbs.map((b) => b.getAttribute("aria-current"))).toEqual(["true", null, null]);

    fireEvent.click(thumbs[2]);
    expect(counter()).toBe("3 / 3");
    expect(thumbs.map((b) => b.getAttribute("aria-current"))).toEqual([null, null, "true"]);
  });

  it("keeps only the shown photo in the tab order", () => {
    render(<VehicleGallery locale="en" media={MANY} title={TITLE} />);
    const opens = screen.getAllByRole("button", { name: /Open photos full screen/ });
    expect(opens.map((b) => b.tabIndex)).toEqual([0, -1, -1]);
    fireEvent.click(screen.getByRole("button", { name: "Next photo" }));
    expect(opens.map((b) => b.tabIndex)).toEqual([-1, 0, -1]);
  });

  it("navigates with the arrow keys (left/right follow the screen in LTR)", () => {
    render(<VehicleGallery locale="en" media={MANY} title={TITLE} />);
    const open = screen.getAllByRole("button", { name: /Open photos full screen/ })[0];
    fireEvent.keyDown(open, { key: "ArrowRight" });
    expect(counter()).toBe("2 / 3");
    fireEvent.keyDown(open, { key: "ArrowLeft" });
    fireEvent.keyDown(open, { key: "ArrowLeft" });
    expect(counter()).toBe("3 / 3");
  });

  it("mirrors arrow keys in Arabic (RTL): the left arrow moves forward", () => {
    render(<VehicleGallery locale="ar" media={MANY} title={TITLE} />);
    const open = screen.getAllByRole("button", { name: /عرض الصور بملء الشاشة/ })[0];
    fireEvent.keyDown(open, { key: "ArrowLeft" });
    expect(counter()).toBe("2 / 3");
  });

  it("opens full screen at the selected photo, navigates, closes with Escape and returns focus", () => {
    render(<VehicleGallery locale="en" media={MANY} title={TITLE} />);
    fireEvent.click(screen.getByRole("button", { name: "Next photo" }));
    const opens = screen.getAllByRole("button", { name: /Open photos full screen/ });
    opens[1].focus();
    fireEvent.click(opens[1]);

    const dialog = screen.getByRole("dialog", { name: "Photos" });
    const dialogCounter = () => dialog.querySelector(".photo-counter [aria-hidden]")?.textContent;
    expect(dialogCounter()).toBe("2 / 3");
    expect(within(dialog).getAllByRole("img")).toHaveLength(3);
    expect(document.documentElement.style.overflow).toBe("hidden");

    fireEvent.click(within(dialog).getByRole("button", { name: "Next photo" }));
    expect(dialogCounter()).toBe("3 / 3");
    fireEvent.keyDown(dialog, { key: "ArrowRight" });
    expect(dialogCounter()).toBe("1 / 3");
    fireEvent.keyDown(dialog, { key: "ArrowLeft" });
    expect(dialogCounter()).toBe("3 / 3");

    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.documentElement.style.overflow).toBe("");
    // The viewport follows the photo the visitor ended on, and focus is back on that photo.
    expect(counter()).toBe("3 / 3");
    expect(document.activeElement).toBe(opens[2]);
  });

  it("closes full screen with the Close button and returns focus to the photo it opened from", () => {
    render(<VehicleGallery locale="en" media={MANY} title={TITLE} />);
    const open = screen.getAllByRole("button", { name: /Open photos full screen/ })[0];
    open.focus();
    fireEvent.click(open);
    fireEvent.click(screen.getByRole("button", { name: "Close photos" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(open);
  });

  it.each([
    ["en", "Previous photo", "Next photo", "Open photos full screen", "Close photos", "Choose a photo", "Photo 1 of 3"],
    ["ar", "الصورة السابقة", "الصورة التالية", "عرض الصور بملء الشاشة", "إغلاق الصور", "اختر صورة", "الصورة 1 من 3"],
    ["ru", "Предыдущее фото", "Следующее фото", "Открыть фото на весь экран", "Закрыть фото", "Выберите фото", "Фото 1 из 3"],
  ] as const)("localizes every control in %s", (locale, previous, next, open, close, rail, position) => {
    render(<VehicleGallery locale={locale} media={MANY} title={TITLE} />);
    expect(screen.getByRole("button", { name: previous })).toBeDefined();
    expect(screen.getByRole("button", { name: next })).toBeDefined();
    expect(screen.getByRole("list", { name: rail })).toBeDefined();
    expect(screen.getByRole("button", { name: position })).toBeDefined();
    fireEvent.click(screen.getAllByRole("button", { name: new RegExp(open) })[0]);
    expect(screen.getByRole("button", { name: close })).toBeDefined();
  });

  it("keeps the visible counter left-to-right in Arabic", () => {
    render(<VehicleGallery locale="ar" media={MANY} title={TITLE} />);
    const visible = document.querySelector(".photo-stage .photo-counter [aria-hidden]");
    expect(visible?.getAttribute("dir")).toBe("ltr");
    expect(visible?.textContent).toBe("1 / 3");
  });
});

describe("VehicleDetail media states", () => {
  it("shows 'Photos unavailable' on a VDP without media and keeps all facts", () => {
    render(<VehicleDetail locale="en" vehicle={syntheticAvailable} />);
    expect(screen.getByRole("heading", { level: 2, name: "Photos" })).toBeDefined();
    expect(screen.getByText("Photos unavailable")).toBeDefined();
    expect(screen.getByText("AED 11,111")).toBeDefined();
  });

  it("puts one gallery before the title and no photos after it", () => {
    const { container } = render(<VehicleDetail locale="en" vehicle={{ ...syntheticAvailable, media: MANY }} />);
    expect(container.querySelectorAll(".photo-viewer")).toHaveLength(1);
    const order = [...container.querySelectorAll(".photo-viewer, h1, .vehicle-actions")].map((el) => el.className || el.tagName);
    expect(order).toEqual(["photo-viewer", "vehicle-title", "vehicle-actions"]);
    const title = container.querySelector("h1") as HTMLElement;
    for (const img of container.querySelectorAll("img")) {
      expect(title.compareDocumentPosition(img) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();
    }
    expect(screen.queryByText("Photos unavailable")).toBeNull();
  });

  it("shows the gallery on a sold VDP without a price or conversion actions", () => {
    const { container } = render(
      <VehicleDetail locale="en" vehicle={{ ...syntheticSold, media: MANY }} serverOrigin="https://site.test" />,
    );
    expect(container.querySelectorAll(".photo-viewer")).toHaveLength(1);
    expect(screen.getByText("This car has been sold.")).toBeDefined();
    expect(screen.queryByText(/AED/)).toBeNull();
    expect(container.querySelectorAll("a[href*='wa.me']")).toHaveLength(0);
    expect(container.textContent).not.toMatch(/whatsapp|request a/i);
  });
});
