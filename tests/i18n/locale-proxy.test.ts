// @vitest-environment node
import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { proxy } from "@/proxy";

const base = "https://am-motors-storefront.vercel.app";

function get(path: string, language: string, cookie?: string) {
  const headers: Record<string, string> = { "accept-language": language };
  if (cookie) headers.cookie = cookie;
  return proxy(new NextRequest(`${base}${path}`, { headers }));
}

describe("automatic locale redirects in Next.js Proxy", () => {
  it("redirects an Arabic visitor from the home page, preserving ad params", () => {
    const response = get("/?utm_source=google&utm_campaign=test&gclid=abc123", "ar-AE,ar;q=0.9,en;q=0.8");
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(`${base}/ar?utm_source=google&utm_campaign=test&gclid=abc123`);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("vary")).toContain("Accept-Language");
    expect(response.headers.get("content-security-policy")).toContain("script-src");
    expect(response.cookies.get("am_site_locale")).toBeUndefined();
  });

  it("keeps the car ID and query string when a Russian visitor opens an ad deep link", () => {
    const response = get("/cars/TEST-0001?utm_medium=cpc&gclid=adclick", "ru-RU,ru;q=0.9");
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(`${base}/ru/cars/TEST-0001?utm_medium=cpc&gclid=adclick`);
  });

  it("never redirects explicit /ar or /ru URLs, even when the cookie or browser disagrees", () => {
    expect(get("/ar/cars/TEST-0001", "en-US", "am_site_locale=en").status).toBe(200);
    expect(get("/ru/cars", "ar-AE", "am_site_locale=ar").status).toBe(200);
  });

  it("does not change English visitors or non-page endpoints", () => {
    expect(get("/cars", "en-US,en;q=0.9").status).toBe(200);
    expect(get("/robots.txt", "ar-AE").status).toBe(200);
    expect(get("/media/TEST-0001/file/revision", "ru-RU").status).toBe(200);
  });

  it("manual switch to English wins over an Arabic browser on later visits", () => {
    const selected = get("/cars/TEST-0001?__am_lang=en&utm_source=google", "ar-AE");
    expect(selected.status).toBe(307);
    expect(selected.headers.get("location")).toBe(`${base}/cars/TEST-0001?utm_source=google`);
    expect(selected.cookies.get("am_site_locale")?.value).toBe("en");
    expect(selected.headers.get("set-cookie")).toContain("HttpOnly");
    expect(selected.headers.get("set-cookie")).toContain("SameSite=lax");
    expect(get("/cars/TEST-0001", "ar-AE", "am_site_locale=en").status).toBe(200);
  });

  it("manual switch to Russian is preserved and remains changeable", () => {
    const selected = get("/ru/cars/TEST-0001?__am_lang=ru", "en-US");
    expect(selected.status).toBe(307);
    expect(selected.headers.get("location")).toBe(`${base}/ru/cars/TEST-0001`);
    expect(selected.cookies.get("am_site_locale")?.value).toBe("ru");
    expect(get("/cars/TEST-0001", "en-US", "am_site_locale=ru").headers.get("location")).toBe(`${base}/ru/cars/TEST-0001`);
    expect(get("/cars?__am_lang=ar", "en-US", "am_site_locale=ru").cookies.get("am_site_locale")?.value).toBe("ar");
  });
});
