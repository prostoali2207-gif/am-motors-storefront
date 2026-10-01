import type { DriveChild } from "./drive-client";

/**
 * PHOTO ORDER — confirmed 2026-10-01 (docs/business-rules.md → "Website photos"): staff name
 * the files in `Website/` `01.*`, `02.*`, `03.*`…; `01.*` is the cover. Applied to `Website/`
 * images only, deterministically, without reading image content or guessing intent:
 *
 *   1. file name, natural order ("2" before "10", "01" before "02"), code-point based (no
 *      locale dependence) — numbered files sort before lettered ones;
 *   2. Drive `createdTime` (upload time), earliest first;
 *   3. Drive file ID — final tie-breaker, because names are NOT unique.
 *
 * Names are never interpreted beyond ordering (no "hero", "cover" or "ad" keyword logic).
 */
export function compareTechnicalFallback(a: DriveChild, b: DriveChild): number {
  return (
    naturalCompare(a.name, b.name) ||
    compareText(a.createdTime ?? "", b.createdTime ?? "") ||
    compareText(a.id, b.id)
  );
}

export function sortTechnicalFallback<T extends DriveChild>(files: readonly T[]): T[] {
  return [...files].sort(compareTechnicalFallback);
}

const CHUNK = /(\d+|\D+)/g;

/** Natural comparison: digit runs compare numerically, other runs by UTF-16 code units. */
export function naturalCompare(a: string, b: string): number {
  const left = a.match(CHUNK) ?? [];
  const right = b.match(CHUNK) ?? [];
  const length = Math.min(left.length, right.length);
  for (let i = 0; i < length; i++) {
    const x = left[i];
    const y = right[i];
    const bothDigits = /^\d/.test(x) && /^\d/.test(y);
    const result = bothDigits ? compareDigits(x, y) : compareText(x, y);
    if (result !== 0) return result;
  }
  return left.length - right.length;
}

function compareDigits(x: string, y: string): number {
  const a = x.replace(/^0+(?=\d)/, "");
  const b = y.replace(/^0+(?=\d)/, "");
  if (a.length !== b.length) return a.length - b.length;
  // Same numeric value: fewer leading zeros first, for determinism.
  return compareText(a, b) || x.length - y.length;
}

function compareText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
