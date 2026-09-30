import Link from "next/link";

import { InventoryList } from "@/components/inventory-list";
import { listAvailableVehicles } from "@/inventory/queries";

export default async function HomePage() {
  const result = await listAvailableVehicles();

  return (
    <>
      <h1>AM Motors</h1>
      <h2>Available cars</h2>
      <InventoryList result={result} headingLevel={3} />
      {result.kind === "ok" ? (
        <p>
          <Link className="text-link" href="/cars">
            All cars
          </Link>
        </p>
      ) : null}
    </>
  );
}
