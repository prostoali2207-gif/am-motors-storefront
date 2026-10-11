import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { isInquiryRef } from "@/attribution/paid-click";
import { resetAttributionMemoryForTests } from "@/attribution/session-attribution";
import { AttributionCapture } from "@/components/attribution-capture";
import { VehicleDetail } from "@/components/vehicle-detail";
import { inquiryMessage } from "@/conversion/inquiry-message";
import { syntheticAvailable } from "../fixtures/vehicles";

const GCLID = "Cj0KCQsynthetic_TEST-gclid0001";

function prefill(link: HTMLElement): string {
  return new URL(link.getAttribute("href") ?? "").searchParams.get("text") ?? "";
}

function renderVdp(inquiryRefs: boolean) {
  render(
    <>
      <AttributionCapture inquiryRefs={inquiryRefs} />
      <VehicleDetail locale="en" vehicle={syntheticAvailable} serverOrigin="https://site.test" />
    </>,
  );
  return within(screen.getByRole("region", { name: "Ask about this car" })).getAllByRole("link");
}

/** Ignores clicks' default navigation in jsdom while letting React's onClick run. */
function click(link: HTMLElement) {
  link.addEventListener("click", (event) => event.preventDefault(), { once: true });
  fireEvent.click(link);
}

let beacon: ReturnType<typeof vi.fn>;

beforeEach(() => {
  window.sessionStorage.clear();
  resetAttributionMemoryForTests();
  window.history.pushState({}, "", `/cars/TEST-0001?utm_source=google&utm_medium=cpc&gclid=${GCLID}`);
  beacon = vi.fn(() => true);
  vi.stubGlobal("navigator", { ...window.navigator, sendBeacon: beacon });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("inquiry reference handoff (feature off — default)", () => {
  it("behaves exactly as before: UTM only, no reference, no click ID, nothing sent", async () => {
    const [question] = renderVdp(false);
    await act(async () => {});
    if (question === undefined) throw new Error("no link");
    click(question);
    const text = prefill(question);
    expect(text).toContain("Source: google");
    expect(text).not.toContain("Inquiry:");
    expect(text).not.toContain(GCLID);
    expect(beacon).not.toHaveBeenCalled();
    expect(JSON.stringify(window.sessionStorage)).not.toContain(GCLID);
  });
});

function refOf(link: HTMLElement): string | undefined {
  return /Inquiry: (G-[A-Z0-9]{6})$/.exec(prefill(link))?.[1];
}

async function payload(call: unknown[]): Promise<Record<string, unknown>> {
  const body = call[1];
  if (body instanceof Blob) return JSON.parse(await body.text());
  const init = body as RequestInit;
  return JSON.parse(await (init.body as Blob).text());
}

describe("inquiry reference handoff (feature on)", () => {
  it("before any tap the link carries no reference (browsing creates none)", async () => {
    const [question] = renderVdp(true);
    await act(async () => {});
    if (question === undefined) throw new Error("no link");
    expect(prefill(question)).not.toContain("Inquiry:");
    expect(beacon).not.toHaveBeenCalled();
  });

  it("one reference per action: the message shows only that ref; the click ID goes first-party once", async () => {
    const [question, viewing] = renderVdp(true);
    await act(async () => {});
    if (question === undefined || viewing === undefined) throw new Error("no links");

    click(question);
    const questionRef = refOf(question);
    expect(isInquiryRef(questionRef)).toBe(true);
    expect(prefill(question)).not.toContain(GCLID);
    expect(prefill(question)).toContain("(Ref: TEST-0001)");
    expect(beacon).toHaveBeenCalledTimes(1);
    expect(beacon.mock.calls[0]?.[0]).toBe("/api/inquiry-ref");
    expect(await payload(beacon.mock.calls[0] as unknown[])).toEqual({
      ref: questionRef,
      click: { type: "gclid", value: GCLID },
      vehicleId: "TEST-0001",
      intent: "question",
      locale: "en",
      utm: { utm_source: "google", utm_medium: "cpc" },
    });

    // Repeated tap on the same action: same message, same ref, no second record.
    click(question);
    expect(refOf(question)).toBe(questionRef);
    expect(beacon).toHaveBeenCalledTimes(1);

    // Changed intent on the same car: a NEW reference and its own single record.
    click(viewing);
    const viewingRef = refOf(viewing);
    expect(isInquiryRef(viewingRef)).toBe(true);
    expect(viewingRef).not.toBe(questionRef);
    expect(beacon).toHaveBeenCalledTimes(2);
    expect((await payload(beacon.mock.calls[1] as unknown[])).ref).toBe(viewingRef);
  });

  it("same Google click, two cars, two messages → two distinct references and two records", async () => {
    const [carA] = renderVdp(true);
    await act(async () => {});
    if (carA === undefined) throw new Error("no link");
    click(carA);
    const refA = refOf(carA);
    cleanup();

    // Same tab session navigates to another car (no click ID in this URL; the first touch is kept).
    window.history.pushState({}, "", "/cars/TEST-0002");
    render(
      <>
        <AttributionCapture inquiryRefs />
        <VehicleDetail locale="en" vehicle={{ ...syntheticAvailable, id: "TEST-0002" }} serverOrigin="https://site.test" />
      </>,
    );
    await act(async () => {});
    const [carB] = within(screen.getByRole("region", { name: "Ask about this car" })).getAllByRole("link");
    if (carB === undefined) throw new Error("no link");
    click(carB);
    const refB = refOf(carB);
    expect(isInquiryRef(refB)).toBe(true);
    expect(refB).not.toBe(refA);
    expect(beacon).toHaveBeenCalledTimes(2);
    const second = await payload(beacon.mock.calls[1] as unknown[]);
    expect(second).toMatchObject({ ref: refB, vehicleId: "TEST-0002", click: { type: "gclid", value: GCLID } });
  });

  it("sends nothing and shows no reference when the visit did not come from a Google click", async () => {
    window.history.pushState({}, "", "/cars/TEST-0001?utm_source=instagram");
    const [question] = renderVdp(true);
    await act(async () => {});
    if (question === undefined) throw new Error("no link");
    click(question);
    expect(prefill(question)).not.toContain("Inquiry:");
    expect(beacon).not.toHaveBeenCalled();
  });

  it("falls back to fetch; a failed delivery is retried on the next tap with the SAME reference", async () => {
    vi.stubGlobal("navigator", { ...window.navigator, sendBeacon: vi.fn(() => false) });
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockRejectedValueOnce(new TypeError("offline"))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchSpy);
    const [question] = renderVdp(true);
    await act(async () => {});
    if (question === undefined) throw new Error("no link");

    click(question);
    const ref = refOf(question);
    await act(async () => {});
    click(question);
    await act(async () => {});
    click(question);
    await act(async () => {});
    click(question);
    await act(async () => {});

    expect(fetchSpy).toHaveBeenCalledTimes(3);
    for (const call of fetchSpy.mock.calls) {
      expect(call[0]).toBe("/api/inquiry-ref");
      expect(call[1]).toMatchObject({ method: "POST", keepalive: true });
      expect((await payload(call as unknown[])).ref).toBe(ref);
    }
    expect(refOf(question)).toBe(ref);
  });

  it("never breaks the link when no delivery API exists at all", async () => {
    vi.stubGlobal("navigator", { ...window.navigator, sendBeacon: undefined });
    vi.stubGlobal("fetch", undefined);
    const [question] = renderVdp(true);
    await act(async () => {});
    if (question === undefined) throw new Error("no link");
    click(question);
    expect(prefill(question)).toMatch(/Inquiry: G-/);
  });
});

describe("inquiryMessage reference line", () => {
  it("appends only a valid reference, after the UTM block", () => {
    const general = { kind: "general", locale: "ru" } as const;
    expect(inquiryMessage(general, null, { utm_source: "google" }, "G-7K3M9P").split("\n").slice(-2)).toEqual([
      "Source: google",
      "Inquiry: G-7K3M9P",
    ]);
    expect(inquiryMessage(general, null, {}, "G-7K3M9P")).toMatch(/\n\nInquiry: G-7K3M9P$/);
    expect(inquiryMessage(general, null, {}, `G-7K3M9P\nRef: FAKE`)).not.toContain("Inquiry:");
    expect(inquiryMessage(general, null, {}, null)).not.toContain("Inquiry:");
  });
});
