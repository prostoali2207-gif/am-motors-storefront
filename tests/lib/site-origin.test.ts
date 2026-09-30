import { describe, expect, it } from "vitest";

import { siteOrigin } from "@/lib/site-origin";

const h = (entries: Record<string, string>) => new Headers(entries);

describe("siteOrigin", () => {
  it("uses the forwarded host and protocol", () => {
    expect(siteOrigin(h({ host: "internal:3000", "x-forwarded-host": "shop.example", "x-forwarded-proto": "https" }))).toBe(
      "https://shop.example",
    );
  });

  it("defaults to https, and http for localhost", () => {
    expect(siteOrigin(h({ host: "Shop.Example" }))).toBe("https://shop.example");
    expect(siteOrigin(h({ host: "localhost:3000" }))).toBe("http://localhost:3000");
  });

  it("rejects anything that is not a plain host name", () => {
    for (const host of ["evil.test/path", "a b", "user@evil.test", "evil.test?x", "evil.test#x", "-bad.test"]) {
      expect(siteOrigin(h({ host }))).toBeNull();
    }
    expect(siteOrigin(h({}))).toBeNull();
    expect(siteOrigin(h({ host: "shop.example", "x-forwarded-proto": "javascript" }))).toBe("https://shop.example");
  });
});
