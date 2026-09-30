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
});
