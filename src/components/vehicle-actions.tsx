import type { Vehicle } from "@/domain/vehicle";
import { vehicleTitle } from "@/domain/vehicle";
import { vehiclePath } from "@/domain/vehicle-id";
import type { Inquiry, VehicleInquiryIntent } from "@/conversion/inquiry-message";
import { StickyActions } from "./sticky-actions";
import { WhatsAppLink } from "./whatsapp-link";

export const VEHICLE_ACTIONS_ID = "vehicle-actions";
const HINT_ID = "vehicle-actions-hint";

function vehicleInquiry(vehicle: Vehicle, intent: VehicleInquiryIntent): Inquiry {
  return { kind: "vehicle", intent, title: vehicleTitle(vehicle), id: vehicle.id, path: vehiclePath(vehicle.id) };
}

/**
 * VDP conversion actions — available vehicles only (sold vehicles get none, enforced here too).
 * In-page zone: WhatsApp (primary), "Request a viewing", "Request a test drive" (secondary). All
 * three open WhatsApp with a different prefilled message; none books, confirms or reserves
 * anything. On small screens a two-action sticky bar (WhatsApp + test drive) appears once this
 * zone has scrolled away.
 */
export function VehicleActions({ vehicle, serverOrigin }: { vehicle: Vehicle; serverOrigin: string | null }) {
  if (vehicle.status !== "available") return null;

  const question = vehicleInquiry(vehicle, "question");
  const viewing = vehicleInquiry(vehicle, "viewing");
  const testDrive = vehicleInquiry(vehicle, "test-drive");

  return (
    <>
      <section id={VEHICLE_ACTIONS_ID} className="vehicle-actions" aria-labelledby="vehicle-actions-heading">
        <h2 id="vehicle-actions-heading" className="visually-hidden">
          Ask about this car
        </h2>
        <WhatsAppLink className="action action-primary" inquiry={question} serverOrigin={serverOrigin} describedBy={HINT_ID}>
          Chat on WhatsApp
        </WhatsAppLink>
        <div className="action-secondary-group">
          <WhatsAppLink className="action action-secondary" inquiry={viewing} serverOrigin={serverOrigin} describedBy={HINT_ID}>
            Request a viewing
          </WhatsAppLink>
          <WhatsAppLink className="action action-secondary" inquiry={testDrive} serverOrigin={serverOrigin} describedBy={HINT_ID}>
            Request a test drive
          </WhatsAppLink>
        </div>
        <p id={HINT_ID} className="action-hint">
          Opens WhatsApp with a message about this car.
        </p>
      </section>
      <StickyActions watchId={VEHICLE_ACTIONS_ID}>
        <WhatsAppLink className="action action-primary" inquiry={question} serverOrigin={serverOrigin} describedBy={HINT_ID}>
          Chat on WhatsApp
        </WhatsAppLink>
        <WhatsAppLink className="action action-secondary" inquiry={testDrive} serverOrigin={serverOrigin} describedBy={HINT_ID}>
          Request a test drive
        </WhatsAppLink>
      </StickyActions>
    </>
  );
}
