import type { Metadata } from "next";

import { InventoryList } from "@/components/inventory-list";
import { listAvailableVehicles } from "@/inventory/queries";

export const metadata: Metadata = {
  title: "Cars",
};

export default async function CarsPage() {
  const result = await listAvailableVehicles();

  return (
    <>
      <h1>Cars</h1>
      <InventoryList result={result} headingLevel={2} />
    </>
  );
}
