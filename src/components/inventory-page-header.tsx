import type { InventoryListResult } from "@/domain/inventory-result";
import type { Locale } from "@/i18n/locales";
import { availableCount } from "./format";

/** Page title with the count of available cars — shown only when the source returned cars. */
export function InventoryPageHeader({
  title,
  result,
  locale,
}: {
  title: string;
  result: InventoryListResult;
  locale: Locale;
}) {
  return (
    <header className="page-header">
      <h1 className="page-title">{title}</h1>
      {result.kind === "ok" ? (
        <p className="page-count figure">{availableCount(result.vehicles.length, locale)}</p>
      ) : null}
    </header>
  );
}
