import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/analytics/google-ads-measurement", () => ({
  ADS_CONSENT_STORAGE_KEY: "am-motors:ads-consent:v1",
  activateGoogleAdsMeasurement: vi.fn(() => true),
}));

import { activateGoogleAdsMeasurement } from "@/analytics/google-ads-measurement";
import { GoogleAdsTracking } from "@/components/google-ads-tracking";

const tagId = "AW-123456";
const label = "TEST_LABEL";
const consentKey = "am-motors:ads-consent:v1";

beforeEach(() => {
  window.localStorage.clear();
  vi.clearAllMocks();
});
afterEach(() => {
  cleanup();
  document.body.classList.remove("am-has-consent-prompt");
});

function renderConsent(locale: "en" | "ru" | "ar" = "en") {
  return render(<GoogleAdsTracking locale={locale} tagId={tagId} label={label} />);
}

describe("Google Ads consent choice", () => {
  it.each([
    ["en", /Help us improve car ads/, /Google does not receive your WhatsApp messages/, "Allow measurement", "Don't allow"],
    ["ru", /Помогите улучшить рекламу автомобилей/, /Google не получает вашу переписку/, "Разрешить учёт", "Не разрешать"],
    ["ar", /ساعدنا في تحسين إعلانات السيارات/, /لا يحصل Google على رسائلك/, "السماح بالقياس", "عدم السماح"],
  ] as const)("explains optional measurement clearly in %s", (locale, title, disclosure, accept, decline) => {
    renderConsent(locale);
    expect(screen.getByText(title)).toBeDefined();
    expect(screen.getByText(disclosure)).toBeDefined();
    expect(screen.getByRole("button", { name: accept })).toBeDefined();
    expect(screen.getByRole("button", { name: decline })).toBeDefined();
    expect(activateGoogleAdsMeasurement).not.toHaveBeenCalled();
  });

  it("respecting No leaves Google disabled and WhatsApp clicks unchanged", () => {
    renderConsent();
    fireEvent.click(screen.getByRole("button", { name: "Don't allow" }));
    expect(window.localStorage.getItem(consentKey)).toBe("no");
    expect(screen.queryByText(/Help us improve car ads/)).toBeNull();
    expect(activateGoogleAdsMeasurement).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Privacy settings" }));
    expect(screen.getByRole("button", { name: "Allow measurement" })).toBeDefined();
    expect(activateGoogleAdsMeasurement).not.toHaveBeenCalled();
  });

  it("enables Google only after Allow and remembers the choice", () => {
    renderConsent("ru");
    fireEvent.click(screen.getByRole("button", { name: "Разрешить учёт" }));
    expect(window.localStorage.getItem(consentKey)).toBe("yes");
    expect(activateGoogleAdsMeasurement).toHaveBeenCalledWith(tagId, label, true);
    expect(screen.queryByText(/Помогите улучшить рекламу автомобилей/)).toBeNull();
  });

  it("honors saved refusal and permits later explicit opt-in", () => {
    window.localStorage.setItem(consentKey, "no");
    renderConsent();
    expect(screen.queryByText(/Help us improve car ads/)).toBeNull();
    expect(activateGoogleAdsMeasurement).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Privacy settings" }));
    fireEvent.click(screen.getByRole("button", { name: "Allow measurement" }));
    expect(window.localStorage.getItem(consentKey)).toBe("yes");
    expect(activateGoogleAdsMeasurement).toHaveBeenCalledWith(tagId, label, true);
  });
});
