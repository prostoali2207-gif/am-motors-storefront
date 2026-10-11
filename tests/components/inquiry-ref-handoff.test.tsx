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

describe("inquiry reference handoff (feature on)", () => {
  it("shows only the short reference to the customer and sends the click ID first-party once per action", async () => {
    const [question, viewing] = renderVdp(true);
    await act(async () => {});
    if (question === undefined || viewing === undefined) throw new Error("no links");

    click(question);
    const text = prefill(question);
    const ref = /Inquiry: (G-[A-Z0-9]{6})$/.exec(text)?.[1];
    expect(isInquiryRef(ref)).toBe(true);
    expect(text).not.toContain(GCLID);
    expect(text).toContain("(Ref: TEST-0001)");

    expect(beacon).toHaveBeenCalledTimes(1);
    const [url, blob] = beacon.mock.calls[0] as [string, Blob];
    expect(url).toBe("/api/inquiry-ref");
    const payload = JSON.parse(await blob.text());
    expect(payload).toEqual({
      ref,
      click: { type: "gclid", value: GCLID },
      vehicleId: "TEST-0001",
      intent: "question",
      locale: "en",
      utm: { utm_source: "google", utm_medium: "cpc" },
    });

    click(question);
    expect(beacon).toHaveBeenCalledTimes(1);

    // Same session, same reference on another action; a separate handoff row for the new intent.
    click(viewing);
    expect(prefill(viewing)).toContain(`Inquiry: ${ref}`);
    expect(beacon).toHaveBeenCalledTimes(2);
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

  it("never breaks the link when the beacon is unavailable", async () => {
    vi.stubGlobal("navigator", { ...window.navigator, sendBeacon: undefined });
    const fetchSpy = vi.fn(async () => new Response(null, { status: 503 }));
    vi.stubGlobal("fetch", fetchSpy);
    const [question] = renderVdp(true);
    await act(async () => {});
    if (question === undefined) throw new Error("no link");
    click(question);
    expect(prefill(question)).toMatch(/Inquiry: G-/);
    expect(fetchSpy).toHaveBeenCalledWith("/api/inquiry-ref", expect.objectContaining({ method: "POST", keepalive: true }));
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
