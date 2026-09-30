import type { Vehicle } from "@/domain/vehicle";
import { vehicleTitle } from "@/domain/vehicle";
import { localizedPath, type Locale } from "@/i18n/locales";
import { messages } from "@/i18n/messages";
import type { Inquiry, VehicleInquiryIntent } from "@/conversion/inquiry-message";
import { StickyActions } from "./sticky-actions";
import { WhatsAppLink } from "./whatsapp-link";

export const VEHICLE_ACTIONS_ID = "vehicle-actions";
const HINT_ID = "vehicle-actions-hint";

/** The inquiry carries the page's language: its message and VDP URL are in that language. */
function vehicleInquiry(vehicle: Vehicle, intent: VehicleInquiryIntent, locale: Locale): Inquiry {
  return {
    kind: "vehicle",
    intent,
    title: vehicleTitle(vehicle),
    id: vehicle.id,
    path: localizedPath(locale, { kind: "vehicle", id: vehicle.id }),
    locale,
  };
}

/**
 * VDP conversion actions — available vehicles only (sold vehicles get none, enforced here too).
 * In-page zone: WhatsApp (primary), "Request a viewing", "Request a test drive" (secondary). All
 * three open WhatsApp with a different prefilled message; none books, confirms or reserves
 * anything. On small screens a two-action sticky bar (WhatsApp + test drive) appears once this
 * zone has scrolled away.
 */
export function VehicleActions({
  vehicle,
  serverOrigin,
  locale,
}: {
  vehicle: Vehicle;
  serverOrigin: string | null;
  locale: Locale;
}) {
  if (vehicle.status !== "available") return null;

  const t = messages(locale);
  const question = vehicleInquiry(vehicle, "question", locale);
  const viewing = vehicleInquiry(vehicle, "viewing", locale);
  const testDrive = vehicleInquiry(vehicle, "test-drive", locale);

  return (
    <>
      <section id={VEHICLE_ACTIONS_ID} className="vehicle-actions" aria-labelledby="vehicle-actions-heading">
        <h2 id="vehicle-actions-heading" className="visually-hidden">
          {t.actionsHeading}
        </h2>
        <WhatsAppLink className="action action-primary" inquiry={question} serverOrigin={serverOrigin} describedBy={HINT_ID}>
          {t.chatOnWhatsApp}
        </WhatsAppLink>
        <div className="action-secondary-group">
          <WhatsAppLink className="action action-secondary" inquiry={viewing} serverOrigin={serverOrigin} describedBy={HINT_ID}>
            {t.requestViewing}
          </WhatsAppLink>
          <WhatsAppLink className="action action-secondary" inquiry={testDrive} serverOrigin={serverOrigin} describedBy={HINT_ID}>
            {t.requestTestDrive}
          </WhatsAppLink>
        </div>
        <p id={HINT_ID} className="action-hint">
          {t.actionsHint}
        </p>
      </section>
      <StickyActions watchId={VEHICLE_ACTIONS_ID}>
        <WhatsAppLink className="action action-primary" inquiry={question} serverOrigin={serverOrigin} describedBy={HINT_ID}>
          {t.chatOnWhatsApp}
        </WhatsAppLink>
        <WhatsAppLink className="action action-secondary" inquiry={testDrive} serverOrigin={serverOrigin} describedBy={HINT_ID}>
          {t.requestTestDrive}
        </WhatsAppLink>
      </StickyActions>
    </>
  );
}
