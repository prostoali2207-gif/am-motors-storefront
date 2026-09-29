/**
 * Display formatting only — values come from the public model unchanged.
 * Digit grouping is provisional: AED formatting rules are an open question in
 * docs/business-rules.md.
 */
const grouped = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

export function formatPriceAed(amount: number): string {
  return `AED ${grouped.format(amount)}`;
}

export function formatMileageKm(km: number): string {
  return `${grouped.format(km)} km`;
}
