import type { DriveChild } from "./drive-client";

/**
 * TECHNICAL FALLBACK ORDER — pending business review (docs/business-rules.md, open question 12).
 *
 * The business has not defined cover selection or photo order. Until it does, media is sorted
 * deterministically and neutrally, without reading image content or guessing intent:
 *
 *   1. file name, natural order ("2" before "10"), code-point based (no locale dependence);
 *   2. Drive `createdTime` (upload time), earliest first;
 *   3. Drive file ID — final tie-breaker, because names are NOT unique.
 *
 * Why name first: it is the only lever the business already controls without new tooling
 * (e.g. prefixing files `01_`, `02_`). Nothing here designates a cover: the first item is only
 * first in this order. Names are never interpreted (no "hero", "cover" or "ad" keyword logic).
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
