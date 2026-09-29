/**
 * Public vehicle ID rules (V1).
 *
 * The Sheet `ID` is used verbatim — no trimming, case change, slugging or format regex.
 * Observed values look like `AM-###`, but that pattern is not a confirmed business rule, so a
 * value such as `AM-1000` must stay valid. V1 only requires: non-empty and unique.
 */

export function isUsableVehicleId(id: unknown): id is string {
  return typeof id === "string" && id.trim() !== "";
}

/**
 * Keeps only records whose ID is usable and appears exactly once. Every record sharing a
 * duplicated ID is dropped (fail closed): we cannot tell which one is authoritative.
 */
export function keepUniquelyIdentified<T extends { readonly id: unknown }>(
  records: readonly T[],
): { kept: T[]; rejectedIds: string[] } {
  const counts = new Map<string, number>();
  for (const record of records) {
    if (isUsableVehicleId(record.id)) {
      counts.set(record.id, (counts.get(record.id) ?? 0) + 1);
    }
  }

  const kept: T[] = [];
  const rejected = new Set<string>();
  for (const record of records) {
    if (!isUsableVehicleId(record.id)) {
      rejected.add("(empty)");
    } else if (counts.get(record.id) !== 1) {
      rejected.add(record.id);
    } else {
      kept.push(record);
    }
  }
  return { kept, rejectedIds: [...rejected] };
}

/** Path for a vehicle detail page, using the authoritative ID verbatim (URL-encoded). */
export function vehiclePath(id: string): string {
  return `/cars/${encodeURIComponent(id)}`;
}
