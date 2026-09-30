import type { Metadata } from "next";

import { GeneralRequest } from "@/components/general-request";
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
      {/* General-request inquiry where browsing ends: after the list, the empty or the unavailable state. */}
      <GeneralRequest />
    </>
  );
}
