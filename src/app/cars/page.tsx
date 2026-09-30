import type { Metadata } from "next";

import { InventoryList } from "@/components/inventory-list";
import { InventoryPageHeader } from "@/components/inventory-page-header";
import { listAvailableVehicles } from "@/inventory/queries";

export const metadata: Metadata = {
  title: "Cars",
};

export default async function CarsPage() {
  const result = await listAvailableVehicles();

  return (
    <>
      <InventoryPageHeader title="All cars" result={result} />
      <InventoryList result={result} headingLevel={2} />
    </>
  );
}
