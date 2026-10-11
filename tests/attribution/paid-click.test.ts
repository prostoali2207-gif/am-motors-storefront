import { beforeEach, describe, expect, it } from "vitest";

import {
  createInquiryRef,
  INQUIRY_REF_ALPHABET,
  isInquiryRef,
  normalizePaidClick,
  parsePaidClick,
} from "@/attribution/paid-click";
import {
  capturePaidSession,
  currentPaidSession,
  markHandoffOnce,
  PAID_CLICK_STORAGE_KEY,
  resetAttributionMemoryForTests,
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
  it("stores nothing while the feature is off (default)", () => {
    expect(capturePaidSession(`?gclid=${GCLID}`)).toBeNull();
    expect(window.sessionStorage.getItem(PAID_CLICK_STORAGE_KEY)).toBeNull();
  });

  it("keeps the first Google click of the session with one reference", () => {
    setInquiryRefsEnabled(true);
    const first = capturePaidSession(`?gclid=${GCLID}`);
    expect(first?.click).toEqual({ type: "gclid", value: GCLID });
    expect(isInquiryRef(first?.ref)).toBe(true);
    expect(capturePaidSession("?gclid=Cj0KCQsyntheticOTHER0002")).toEqual(first);
    expect(capturePaidSession("")).toEqual(first);
    expect(JSON.parse(window.sessionStorage.getItem(PAID_CLICK_STORAGE_KEY) ?? "null")).toEqual(first);
  });

  it("has no paid session without a click ID", () => {
    setInquiryRefsEnabled(true);
    window.history.pushState({}, "", "/cars?utm_source=google&utm_medium=cpc");
    expect(currentPaidSession()).toBeNull();
  });

  it("drops tampered storage and starts from the URL", () => {
    setInquiryRefsEnabled(true);
    window.sessionStorage.setItem(PAID_CLICK_STORAGE_KEY, JSON.stringify({ click: { type: "gclid", value: GCLID }, ref: "X" }));
    expect(capturePaidSession("")).toBeNull();
  });

  it("reports each handoff key once", () => {
    expect(markHandoffOnce("G-ABCDEF|question|AM-1")).toBe(true);
    expect(markHandoffOnce("G-ABCDEF|question|AM-1")).toBe(false);
    expect(markHandoffOnce("G-ABCDEF|viewing|AM-1")).toBe(true);
  });
});
