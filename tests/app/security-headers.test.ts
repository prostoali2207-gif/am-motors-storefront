// @vitest-environment node
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { contentSecurityPolicy, createNonce, STATIC_SECURITY_HEADERS } from "@/lib/security-headers";
import { config, proxy } from "@/proxy";
import nextConfig from "../../next.config";

function directives(csp: string): Map<string, string[]> {
  return new Map(
    csp.split(";").map((part) => {
      const [name, ...values] = part.trim().split(/\s+/);
      return [name, values];
    }),
  );
}

describe("Content-Security-Policy", () => {
  const policy = directives(contentSecurityPolicy({ nonce: "TESTNONCE", development: false }));

  it("allows scripts only by this request's nonce (no inline, no eval in builds)", () => {
    expect(policy.get("script-src")).toEqual(["'self'", "'nonce-TESTNONCE'", "'strict-dynamic'"]);
  });

  it("allows 'unsafe-eval' only in development", () => {
    const dev = directives(contentSecurityPolicy({ nonce: "N", development: true }));
    expect(dev.get("script-src")).toContain("'unsafe-eval'");
    expect(dev.has("upgrade-insecure-requests")).toBe(false);
    expect(policy.has("upgrade-insecure-requests")).toBe(true);
  });

  it("blocks framing, plugins, base-tag and form hijacking", () => {
    expect(policy.get("frame-ancestors")).toEqual(["'none'"]);
    expect(policy.get("object-src")).toEqual(["'none'"]);
    expect(policy.get("base-uri")).toEqual(["'none'"]);
    expect(policy.get("form-action")).toEqual(["'none'"]);
    expect(policy.get("frame-src")).toEqual(["'none'"]);
  });

  it("is first-party only: no remote hosts or wildcards in any directive", () => {
    for (const [name, values] of policy) {
      for (const value of values) {
        expect(value, `${name} ${value}`).not.toMatch(/\*|https?:|wss?:|\.com|\.app|vercel|google/);
      }
    }
    // Images: same-origin (/_next/image of /media) and the empty data: favicon only.
    expect(policy.get("img-src")).toEqual(["'self'", "data:"]);
    expect(policy.get("connect-src")).toEqual(["'self'"]);
  });

  it("creates a fresh 128-bit nonce each time", () => {
    const a = createNonce();
    expect(atob(a)).toHaveLength(16);
    expect(createNonce()).not.toBe(a);
  });
});

describe("proxy", () => {
  it("sets the same nonce policy on the response and on the request Next.js renders", () => {
    const response = proxy(new NextRequest("https://example.test/cars"));
    const csp = response.headers.get("content-security-policy") ?? "";
    expect(csp).toMatch(/script-src 'self' 'nonce-[A-Za-z0-9+/=]{24}' 'strict-dynamic'/);
    // NextResponse.next({ request: { headers } }) forwards overridden request headers this way.
    expect(response.headers.get("x-middleware-request-content-security-policy")).toBe(csp);
  });

  it("uses a different nonce per request", () => {
    const a = proxy(new NextRequest("https://example.test/")).headers.get("content-security-policy");
    const b = proxy(new NextRequest("https://example.test/")).headers.get("content-security-policy");
    expect(a).not.toBe(b);
  });

  it("runs on pages but not on build assets, optimized images or the /media route", () => {
    const source = new RegExp(`^${config.matcher[0].source}$`);
    for (const path of ["/", "/cars", "/cars/TEST-0001", "/ar/cars/TEST-0001", "/ru", "/no/such/page"]) {
      expect(source.test(path), path).toBe(true);
    }
    for (const path of ["/_next/static/chunks/a.js", "/_next/image", "/media/TEST-0001/x/y"]) {
      expect(source.test(path), path).toBe(false);
    }
  });
});

describe("static security headers", () => {
  it("are applied to every path by next.config", async () => {
    const rules = await nextConfig.headers!();
    expect(rules).toEqual([{ source: "/:path*", headers: [...STATIC_SECURITY_HEADERS] }]);
    expect(nextConfig.poweredByHeader).toBe(false);
  });

  it("cover sniffing, referrer, browser features, framing and opener", () => {
    const byKey = Object.fromEntries(STATIC_SECURITY_HEADERS.map(({ key, value }) => [key, value]));
    expect(byKey["X-Content-Type-Options"]).toBe("nosniff");
    expect(byKey["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(byKey["X-Frame-Options"]).toBe("DENY");
    expect(byKey["Cross-Origin-Opener-Policy"]).toBe("same-origin");
    expect(byKey["Permissions-Policy"]).toMatch(/camera=\(\).*microphone=\(\).*geolocation=\(\)/);
  });
});
