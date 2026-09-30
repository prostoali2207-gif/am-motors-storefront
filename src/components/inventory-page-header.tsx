import type { InventoryListResult } from "@/domain/inventory-result";
import { availableCount } from "./format";

/** Page title with the count of available cars — shown only when the source returned cars. */
export function InventoryPageHeader({ title, result }: { title: string; result: InventoryListResult }) {
  return (
    <header className="page-header">
      <h1 className="page-title">{title}</h1>
      {result.kind === "ok" ? (
        <p className="page-count figure">{availableCount(result.vehicles.length)}</p>
      ) : null}
    </header>
  );
}
