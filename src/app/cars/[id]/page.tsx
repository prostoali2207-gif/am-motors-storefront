import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { GeneralRequest } from "@/components/general-request";
import { InventoryUnavailable } from "@/components/inventory-unavailable";
import { VehicleDetail } from "@/components/vehicle-detail";
import { vehicleTitle } from "@/domain/vehicle";
import { getVehicle } from "@/inventory/queries";
import { siteOrigin } from "@/lib/site-origin";

// No loading.tsx for this segment on purpose: an unknown ID must return a real 404 status,
// which requires the response not to be streamed before `notFound()` runs.

export async function generateMetadata(props: PageProps<"/cars/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const result = await getVehicle(id);

  switch (result.kind) {
    case "ok":
      return { title: vehicleTitle(result.vehicle) };
    case "not-found":
      return { title: "Car not found", robots: { index: false } };
    case "unavailable":
      return { title: "Inventory unavailable", robots: { index: false } };
    default: {
      const unhandled: never = result;
      return unhandled;
    }
  }
}

export default async function VehiclePage(props: PageProps<"/cars/[id]">) {
  const { id } = await props.params;
  const result = await getVehicle(id);

  switch (result.kind) {
    case "ok":
      // The VDP URL in WhatsApp messages uses the origin the visitor actually used.
      return <VehicleDetail vehicle={result.vehicle} serverOrigin={siteOrigin(await headers())} />;
    case "not-found":
      notFound();
    case "unavailable":
      return (
        <section className="status-page">
          <h1 className="page-title">Car details</h1>
          <InventoryUnavailable />
          <GeneralRequest />
        </section>
      );
    default: {
      const unhandled: never = result;
      return unhandled;
    }
  }
}
