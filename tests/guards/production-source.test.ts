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
    const serverOnly = ["src/lib/env.ts", "src/inventory/index.ts", "src/adapters/google-sheets/auth.ts"];
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

describe("test data guards", () => {
  it("uses only synthetic IDs in tests (nothing shaped like the observed real AM-### IDs)", () => {
    const offenders = testFiles.filter(({ text }) => /\bAM-\d{3}\b/.test(text));
    expect(offenders.map((f) => f.path)).toEqual([]);
  });
});
