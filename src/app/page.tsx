import { InventoryList } from "@/components/inventory-list";
import { InventoryPageHeader } from "@/components/inventory-page-header";
import { listAvailableVehicles } from "@/inventory/queries";

/** Inventory-first homepage: no hero, the available cars start in the first mobile viewport. */
export default async function HomePage() {
  const result = await listAvailableVehicles();

  return (
    <>
      <InventoryPageHeader title="Cars in stock" result={result} />
      <InventoryList result={result} headingLevel={2} />
    </>
  );
}
