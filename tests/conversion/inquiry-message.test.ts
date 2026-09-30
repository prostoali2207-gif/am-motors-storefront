import { describe, expect, it } from "vitest";

import { parseAttribution } from "@/attribution/attribution";
import { GENERAL_REQUEST_MESSAGE, inquiryMessage, type Inquiry } from "@/conversion/inquiry-message";
import { WHATSAPP_BUSINESS_NUMBER, whatsAppUrl } from "@/conversion/whatsapp";
import { vehicleTitle } from "@/domain/vehicle";
import { vehiclePath } from "@/domain/vehicle-id";
import { syntheticAvailable, syntheticLongId } from "../fixtures/vehicles";

const ORIGIN = "https://site.test";

function vehicleInquiry(intent: "question" | "viewing" | "test-drive", vehicle = syntheticAvailable): Inquiry {
  return { kind: "vehicle", intent, title: vehicleTitle(vehicle), id: vehicle.id, path: vehiclePath(vehicle.id) };
}

/** Decodes the `text` parameter exactly as WhatsApp would. */
function decodedText(url: string): string {
  const match = /^https:\/\/wa\.me\/(\d+)\?text=([^&#]*)$/.exec(url);
  if (!match) throw new Error(`not a wa.me URL: ${url}`);
  return decodeURIComponent(match[2] ?? "");
}

describe("WhatsApp business number", () => {
  it("is the confirmed number, canonical wa.me digits", () => {
    expect(WHATSAPP_BUSINESS_NUMBER.digits).toBe("971503432337");
    expect(WHATSAPP_BUSINESS_NUMBER.display).toBe("+971 50 343 2337");
    expect(whatsAppUrl("x").startsWith("https://wa.me/971503432337?text=")).toBe(true);
  });

  it("percent-encodes the message so it cannot alter the URL", () => {
    const text = "Hi & bye? #1 100% a+b/c\nnew line 'quote' ё";
    const url = whatsAppUrl(text);
    expect(url).toBe(`https://wa.me/971503432337?text=${encodeURIComponent(text)}`);
    expect(url).not.toMatch(/[\s#&]|\+b/);
    expect(url).toContain("%0A");
    expect(url).toContain("%20");
    expect(new URL(url).host).toBe("wa.me");
    expect(new URL(url).searchParams.get("text")).toBe(text);
    expect(decodedText(url)).toBe(text);
  });
});

describe("vehicle inquiry messages", () => {
  it("uses the confirmed templates with the public title, public ID and the VDP URL", () => {
    expect(inquiryMessage(vehicleInquiry("question"), ORIGIN)).toBe(
      "Hi, I'm interested in 2001 Testmake Fixture Alpha Synthetic Trim (Ref: TEST-0001).\nhttps://site.test/cars/TEST-0001",
    );
    expect(inquiryMessage(vehicleInquiry("viewing"), ORIGIN)).toBe(
      "Hi, I'd like to request a viewing for 2001 Testmake Fixture Alpha Synthetic Trim (Ref: TEST-0001).\nhttps://site.test/cars/TEST-0001",
    );
    expect(inquiryMessage(vehicleInquiry("test-drive"), ORIGIN)).toBe(
      "Hi, I'd like to request a test drive for 2001 Testmake Fixture Alpha Synthetic Trim (Ref: TEST-0001).\nhttps://site.test/cars/TEST-0001",
    );
  });

  it("keeps the three intents distinct", () => {
    const messages = (["question", "viewing", "test-drive"] as const).map((intent) =>
      inquiryMessage(vehicleInquiry(intent), ORIGIN),
    );
    expect(new Set(messages).size).toBe(3);
  });

  it("uses the ID verbatim in the text and URL-encodes it in the link", () => {
    const odd = { ...syntheticLongId, id: "TEST 7/Б" };
    const text = inquiryMessage(vehicleInquiry("question", odd), ORIGIN);
    expect(text).toContain("(Ref: TEST 7/Б)");
    expect(text).toContain(`https://site.test/cars/${encodeURIComponent("TEST 7/Б")}`);
    expect(decodedText(whatsAppUrl(text))).toBe(text);
  });

  it("leaves the URL line out when the origin is unknown instead of guessing one", () => {
    expect(inquiryMessage(vehicleInquiry("question"), null)).toBe(
      "Hi, I'm interested in 2001 Testmake Fixture Alpha Synthetic Trim (Ref: TEST-0001).",
    );
  });

  it("never states price, status, condition, finance or any promise", () => {
    for (const intent of ["question", "viewing", "test-drive"] as const) {
      const text = inquiryMessage(vehicleInquiry(intent), ORIGIN, { utm_source: "x" });
      expect(text).not.toMatch(/AED|11,?111|22,?222|available|sold|condition|finance|warranty|guarantee/i);
      expect(text).not.toMatch(/\b(book|booking|booked|reserve|reserved|reservation|confirm|confirmed)\b/i);
    }
  });
});

describe("general-request message", () => {
  it("is the confirmed neutral message with no vehicle and no promise", () => {
    expect(GENERAL_REQUEST_MESSAGE).toBe(
      "Hi, I couldn't find the car I'm looking for on the website. Can you help me with current availability?",
    );
    expect(inquiryMessage({ kind: "general" }, ORIGIN)).toBe(GENERAL_REQUEST_MESSAGE);
    expect(GENERAL_REQUEST_MESSAGE).not.toMatch(/source|import|order|find (it|any)|guarantee|\bbook|reserve|confirm/i);
  });
});

describe("attribution block in messages", () => {
  it("is absent when no attribution was received", () => {
    const text = inquiryMessage(vehicleInquiry("viewing"), ORIGIN, {});
    expect(text).not.toMatch(/Source|Campaign|Medium|Content|Term|fbclid/);
    expect(text.split("\n")).toHaveLength(2);
  });

  it("lists only the values actually received, after a blank line", () => {
    const text = inquiryMessage(vehicleInquiry("test-drive"), ORIGIN, {
      utm_source: "instagram",
      utm_campaign: "yaris_reel",
      utm_content: "reel_a",
    });
    expect(text).toBe(
      "Hi, I'd like to request a test drive for 2001 Testmake Fixture Alpha Synthetic Trim (Ref: TEST-0001).\n" +
        "https://site.test/cars/TEST-0001\n\nSource: instagram\nCampaign: yaris_reel\nContent: reel_a",
    );
    expect(text).not.toMatch(/Medium|Term|fbclid/);
  });

  it("adds nothing for an ad click ID alone and invents no source from it", () => {
    const text = inquiryMessage({ kind: "general" }, ORIGIN, parseAttribution("?fbclid=IwAR0synthetic"));
    expect(text).toBe(GENERAL_REQUEST_MESSAGE);
    expect(text).not.toMatch(/fbclid|IwAR0|Source|Campaign|facebook|meta|instagram/i);
  });

  it("round-trips through the wa.me URL encoding", () => {
    const text = inquiryMessage(vehicleInquiry("question"), ORIGIN, { utm_source: "a&b", utm_term: "x y#z" });
    expect(decodedText(whatsAppUrl(text))).toBe(text);
  });
});
