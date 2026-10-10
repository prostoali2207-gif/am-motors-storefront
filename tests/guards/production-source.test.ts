import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const SRC = join(process.cwd(), "src");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? sourceFiles(path) : /\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}

const files = sourceFiles(SRC).map((path) => ({ path, text: readFileSync(path, "utf8") }));
const testFiles = sourceFiles(join(process.cwd(), "tests")).map((path) => ({
  path,
  text: readFileSync(path, "utf8"),
}));

describe("production source guards", () => {
  it("finds production source files", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it("never imports from the tests directory", () => {
    const offenders = files.filter(({ text }) => /from\s+["'][^"']*tests\//.test(text));
    expect(offenders.map((f) => f.path)).toEqual([]);
  });

  it("contains no synthetic fixture markers", () => {
    const offenders = files.filter(({ text }) => /Testmake|TEST-\d|Fixture (Alpha|Beta|Gamma|Delta)/.test(text));
    expect(offenders.map((f) => f.path)).toEqual([]);
  });

  it("does not label site actions as qualified leads or use 'Book' wording", () => {
    const offenders = files.filter(({ text }) => /qualified lead|\bBook\b/i.test(text));
    expect(offenders.map((f) => f.path)).toEqual([]);
  });

  it("does not introduce a reserved status", () => {
    const offenders = files.filter(({ text }) => /["']reserved["']/i.test(text));
    expect(offenders.map((f) => f.path)).toEqual([]);
  });

  it("never uses NEXT_PUBLIC_ variables (credentials and Sheet IDs stay server-side)", () => {
    const offenders = files.filter(({ text }) => /NEXT_PUBLIC_[A-Z]/.test(text));
    expect(offenders.map((f) => f.path)).toEqual([]);
  });

  it("keeps credential and data-source modules server-only", () => {
    const serverOnly = [
      "src/lib/env.ts",
      "src/inventory/index.ts",
      "src/adapters/google-sheets/auth.ts",
      "src/adapters/google-drive-media/image-pipeline.ts",
    ];
    for (const path of serverOnly) {
      expect(readFileSync(join(process.cwd(), path), "utf8")).toMatch(/^import "server-only";/);
    }
  });

  it("never spreads or assigns source rows into vehicles in adapters", () => {
    const adapters = files.filter(({ path }) => path.includes(`${join("src", "adapters")}`));
    const offenders = adapters.filter(({ text }) => /\.\.\.(row|cells|raw|source)\b|Object\.assign\(/.test(text));
    expect(offenders.map((f) => f.path)).toEqual([]);
  });

  it("has no default or fallback status", () => {
    const offenders = files.filter(({ text }) => /status\s*(\?\?|\|\|)\s*["']/.test(text));
    expect(offenders.map((f) => f.path)).toEqual([]);
  });
});

describe("conversion and attribution guards", () => {
  it("keeps the WhatsApp number and wa.me URL building in one module", () => {
    const withNumber = files.filter(({ text }) => /971\s*50\s*343\s*2337|971503432337/.test(text));
    expect(withNumber.map((f) => f.path)).toEqual([join(SRC, "conversion", "whatsapp.ts")]);
    const withWaMe = files.filter(({ text }) => /wa\.me|api\.whatsapp|whatsapp:\/\//.test(text));
    expect(withWaMe.map((f) => f.path)).toEqual([join(SRC, "conversion", "whatsapp.ts")]);
  });

  it("loads no tracking pixels or third-party analytics", () => {
    const offenders = files.filter(({ text }) =>
      /googletagmanager|google-analytics|gtag\(|fbq\(|connect\.facebook\.net|analytics\.tiktok|ttq\.|next\/script|@vercel\/analytics|posthog|segment\.com|hotjar|clarity\.ms/i.test(
        text,
      ),
    );
    expect(offenders.map((f) => f.path)).toEqual([]);
  });

  it("sets no cookies and posts no inquiry data anywhere (no API route, no fetch from the browser)", () => {
    expect(files.filter(({ text }) => /document\.cookie|cookies\(\)/.test(text)).map((f) => f.path)).toEqual([]);
    const client = files.filter(({ text }) => /^["']use client["'];/m.test(text));
    expect(client.length).toBeGreaterThan(0);
    const clientOffenders = client.filter(({ text }) => /\bfetch\(|sendBeacon|XMLHttpRequest|WebSocket/.test(text));
    expect(clientOffenders.map((f) => f.path)).toEqual([]);
    const routes = files.filter(({ path }) => /[\\/]route\.ts$/.test(path)).map((f) => f.path);
    expect(routes).toEqual([join(SRC, "app", "media", "[vehicleId]", "[mediaId]", "[revision]", "route.ts")]);
  });

  it("keeps attribution storage free of vehicle data", () => {
    const attribution = files.filter(({ path }) => path.includes(join("src", "attribution")));
    expect(attribution.length).toBe(2);
    for (const { text } of attribution) {
      expect(text).not.toMatch(/@\/domain|@\/inventory|@\/adapters|Vehicle\b/);
    }
  });
});

describe("media guards", () => {
  const rendered = files.filter(({ path }) => /src[\\/](app|components|domain)[\\/]/.test(path));

  it("never uses Google Drive / Google-hosted URLs in routes, components or the public model", () => {
    const offenders = rendered.filter(({ text }) => /drive\.google|googleusercontent|googleapis/.test(text));
    expect(offenders.map((f) => f.path)).toEqual([]);
  });

  it("serves only sanitized same-origin /media images, without the broken Vercel optimizer", () => {
    const config = readFileSync(join(process.cwd(), "next.config.ts"), "utf8");
    expect(config).toContain(`localPatterns: [{ pathname: "/media/**", search: "" }]`);
    expect(config).toContain("remotePatterns: []");
    // Vercel currently crashes on /_next/image. The direct /media route checks vehicle
    // ownership and publishes sanitized, resized JPEGs without private Drive identifiers.
    expect(config).toContain("unoptimized: true");
    expect(config).not.toMatch(/drive\.google|googleusercontent|googleapis|dangerouslyAllow/i);
  });

  it("renders at most one cover image on listing cards: first image only, no video, no carousel", () => {
    const card = readFileSync(join(process.cwd(), "src/components/vehicle-card.tsx"), "utf8");
    expect(card).toContain("vehicleImages(vehicle.media)[0]");
    expect(card.match(/<Image\b/g)).toHaveLength(1);
    expect(card).not.toMatch(/<img|<video|\.media\.map|\.media\[|use client/);
  });

  it("does not prefetch VDPs from listing cards (a VDP render resolves Drive media)", () => {
    const card = readFileSync(join(process.cwd(), "src/components/vehicle-card.tsx"), "utf8");
    const links = card.match(/<Link\b[^>]*>/g) ?? [];
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) expect(link).toContain("prefetch={false}");
  });

  it("never renders <video> anywhere (no public video delivery yet)", () => {
    const offenders = rendered.filter(({ text }) => /<video\b/.test(text));
    expect(offenders.map((f) => f.path)).toEqual([]);
  });

  it("has no stock, placeholder or 'coming soon' media wording", () => {
    const offenders = rendered.filter(({ text }) => /coming soon|stock photo|placeholder car/i.test(text));
    expect(offenders.map((f) => f.path)).toEqual([]);
  });
});

describe("repository content guards", () => {
  const IGNORED = new Set(["node_modules", ".next", ".git"]);
  const MEDIA_EXT = /\.(jpe?g|png|webp|avif|gif|heic|heif|tiff?|bmp|mov|mp4|m4v|webm|avi|mkv|3gp)$/i;

  function repoFiles(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
      if (IGNORED.has(name)) return [];
      const path = join(dir, name);
      return statSync(path).isDirectory() ? repoFiles(path) : [path];
    });
  }

  it("contains no image or video files (no real media copied into the repo)", () => {
    expect(repoFiles(process.cwd()).filter((path) => MEDIA_EXT.test(path))).toEqual([]);
  });
});

describe("test data guards", () => {
  it("uses only synthetic IDs in tests (nothing shaped like the observed real AM-### IDs)", () => {
    const offenders = testFiles.filter(({ text }) => /\bAM-\d{3}\b/.test(text));
    expect(offenders.map((f) => f.path)).toEqual([]);
  });
});
