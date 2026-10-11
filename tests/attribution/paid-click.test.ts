import { beforeEach, describe, expect, it } from "vitest";

import {
  createInquiryRef,
  INQUIRY_REF_ALPHABET,
  isInquiryRef,
  normalizePaidClick,
  parsePaidClick,
} from "@/attribution/paid-click";
import {
  capturePaidClick,
  currentPaidClick,
  handoffKey,
  PAID_CLICK_STORAGE_KEY,
  paidHandoff,
  resetAttributionMemoryForTests,
  setHandoffReported,
  setInquiryRefsEnabled,
} from "@/attribution/session-attribution";

const GCLID = "Cj0KCQsynthetic_TEST-gclid0001";

beforeEach(() => {
  window.sessionStorage.clear();
  resetAttributionMemoryForTests();
  window.history.pushState({}, "", "/");
});

describe("parsePaidClick", () => {
  it("reads gclid, then gbraid, then wbraid; first valid wins", () => {
    expect(parsePaidClick(`?gclid=${GCLID}`)).toEqual({ type: "gclid", value: GCLID });
    expect(parsePaidClick("?wbraid=WBRAIDsynthetic01&gbraid=GBRAIDsynthetic01")).toEqual({
      type: "gbraid",
      value: "GBRAIDsynthetic01",
    });
  });

  it("ignores missing, short, oversized or non-token values and other click IDs", () => {
    expect(parsePaidClick("")).toBeNull();
    expect(parsePaidClick("?fbclid=IwAR0syntheticvalue")).toBeNull();
    expect(parsePaidClick("?gclid=short")).toBeNull();
    expect(parsePaidClick(`?gclid=${"a".repeat(201)}`)).toBeNull();
    expect(parsePaidClick(`?gclid=${encodeURIComponent("=HYPERLINK(\"x\")")}`)).toBeNull();
    expect(parsePaidClick(`?gclid=${encodeURIComponent("abc def ghi jkl")}`)).toBeNull();
  });

  it("re-validates stored data", () => {
    expect(normalizePaidClick({ type: "gclid", value: GCLID })).toEqual({ type: "gclid", value: GCLID });
    expect(normalizePaidClick({ type: "fbclid", value: GCLID })).toBeNull();
    expect(normalizePaidClick({ type: "gclid", value: 5 })).toBeNull();
    expect(normalizePaidClick(null)).toBeNull();
  });
});

describe("inquiry reference", () => {
  it("is G- plus six unambiguous symbols", () => {
    for (let i = 0; i < 200; i++) expect(isInquiryRef(createInquiryRef())).toBe(true);
    expect(INQUIRY_REF_ALPHABET).not.toMatch(/[01OIL]/);
    expect(isInquiryRef("G-ABC12O")).toBe(false);
    expect(isInquiryRef("G-ABCDE")).toBe(false);
    expect(isInquiryRef("g-ABCDEF")).toBe(false);
    expect(isInquiryRef(" G-ABCDEF")).toBe(false);
  });

  it("uses rejection sampling: bytes ≥ 248 are skipped, not folded into the alphabet", () => {
    const sequences = [new Uint8Array([255, 248, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])];
    const ref = createInquiryRef(() => sequences.shift() ?? new Uint8Array(12));
    expect(ref).toBe(`G-${INQUIRY_REF_ALPHABET.slice(0, 6)}`);
  });

  it("is not sequential", () => {
    const refs = new Set(Array.from({ length: 500 }, () => createInquiryRef()));
    expect(refs.size).toBe(500);
  });
});

describe("paid session store", () => {
  it("stores nothing and creates no reference while the feature is off (default)", () => {
    window.history.pushState({}, "", `/cars/TEST-0001?gclid=${GCLID}`);
    expect(capturePaidClick(`?gclid=${GCLID}`)).toBeNull();
    expect(paidHandoff(handoffKey("question", "TEST-0001"))).toBeNull();
    expect(window.sessionStorage.getItem(PAID_CLICK_STORAGE_KEY)).toBeNull();
  });

  it("keeps the first Google click of the session (first touch)", () => {
    setInquiryRefsEnabled(true);
    expect(capturePaidClick(`?gclid=${GCLID}`)).toEqual({ type: "gclid", value: GCLID });
    expect(capturePaidClick("?gclid=Cj0KCQsyntheticOTHER0002")).toEqual({ type: "gclid", value: GCLID });
    expect(capturePaidClick("")).toEqual({ type: "gclid", value: GCLID });
  });

  it("gives each action its own reference: same click → two cars / intents → distinct refs; repeat → same ref", () => {
    setInquiryRefsEnabled(true);
    window.history.pushState({}, "", `/cars/TEST-0001?gclid=${GCLID}`);
    const carA = paidHandoff(handoffKey("question", "TEST-0001"));
    const carB = paidHandoff(handoffKey("question", "TEST-0002"));
    const carAViewing = paidHandoff(handoffKey("viewing", "TEST-0001"));
    const general = paidHandoff(handoffKey("general", null));
    const refs = [carA, carB, carAViewing, general].map((h) => h?.ref);
    for (const ref of refs) expect(isInquiryRef(ref)).toBe(true);
    expect(new Set(refs).size).toBe(4);
    for (const h of [carA, carB, carAViewing, general]) expect(h?.click).toEqual({ type: "gclid", value: GCLID });
    expect(paidHandoff(handoffKey("question", "TEST-0001"))?.ref).toBe(carA?.ref);
  });

  it("keeps references and delivery state across reloads of the same tab (sessionStorage)", () => {
    setInquiryRefsEnabled(true);
    window.history.pushState({}, "", `/?gclid=${GCLID}`);
    const key = handoffKey("question", "TEST-0001");
    const first = paidHandoff(key);
    setHandoffReported(key, true);
    resetAttributionMemoryForTests();
    setInquiryRefsEnabled(true);
    window.history.pushState({}, "", "/cars/TEST-0001");
    expect(paidHandoff(key)).toEqual({ click: first?.click, ref: first?.ref, reported: true });
    setHandoffReported(key, false);
    expect(paidHandoff(key)?.reported).toBe(false);
  });

  it("has no paid click without a click ID", () => {
    setInquiryRefsEnabled(true);
    window.history.pushState({}, "", "/cars?utm_source=google&utm_medium=cpc");
    expect(currentPaidClick()).toBeNull();
    expect(paidHandoff(handoffKey("question", "TEST-0001"))).toBeNull();
  });

  it("drops tampered stored references and keeps only valid ones", () => {
    setInquiryRefsEnabled(true);
    window.sessionStorage.setItem(
      PAID_CLICK_STORAGE_KEY,
      JSON.stringify({
        click: { type: "gclid", value: GCLID },
        handoffs: { "question|TEST-0001": { ref: "X", reported: true }, "viewing|TEST-0001": { ref: "G-7K3M9P", reported: "yes" } },
      }),
    );
    expect(paidHandoff("viewing|TEST-0001")).toEqual({ click: { type: "gclid", value: GCLID }, ref: "G-7K3M9P", reported: false });
    const fresh = paidHandoff("question|TEST-0001");
    expect(fresh?.ref).not.toBe("X");
    expect(isInquiryRef(fresh?.ref)).toBe(true);
  });

  it("bounds the number of references per session; beyond it the link works without one", () => {
    setInquiryRefsEnabled(true);
    window.history.pushState({}, "", `/?gclid=${GCLID}`);
    for (let i = 0; i < 50; i++) expect(paidHandoff(handoffKey("question", `TEST-${i}`))).not.toBeNull();
    expect(paidHandoff(handoffKey("question", "TEST-OVER"))).toBeNull();
  });
});
