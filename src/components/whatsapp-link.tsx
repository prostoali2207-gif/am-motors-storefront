"use client";

import { useSyncExternalStore, type MouseEvent, type ReactNode } from "react";

import { sendHandoffBeacon } from "@/attribution/handoff-beacon";
import { currentAttribution, currentPaidSession } from "@/attribution/session-attribution";
import { inquiryMessage, type Inquiry } from "@/conversion/inquiry-message";
import { whatsAppUrl } from "@/conversion/whatsapp";

function browserHref(inquiry: Inquiry): string {
  // `currentPaidSession()` is null unless the server enabled inquiry references (issue #19) and
  // this tab landed from a Google ad click; then only the short reference enters the message.
  const paid = currentPaidSession();
  return whatsAppUrl(inquiryMessage(inquiry, window.location.origin, currentAttribution(), paid?.ref ?? null));
}

function reportHandoff(inquiry: Inquiry): void {
  const paid = currentPaidSession();
  if (paid === null) return;
  sendHandoffBeacon({
    paid,
    vehicleId: inquiry.kind === "vehicle" ? inquiry.id : null,
    intent: inquiry.kind === "vehicle" ? inquiry.intent : "general",
    locale: inquiry.locale,
    utm: currentAttribution(),
  });
}

/** Location and session attribution do not change while a page is shown; no subscription needed. */
const subscribe = () => () => {};

/**
 * A plain link to WhatsApp with a prefilled inquiry. Works without JavaScript (server-rendered
 * href, origin from the request); in the browser the href is rebuilt with the page's actual origin
 * and the session's first-touch attribution, and once more at click time so it is never stale.
 * Reading the attribution also records it (first touch), which is idempotent.
 *
 * Nothing is sent by the site: the visitor sees the message in WhatsApp and decides to send it.
 */
export function WhatsAppLink({
  inquiry,
  serverOrigin,
  className,
  describedBy,
  children,
}: {
  inquiry: Inquiry;
  serverOrigin: string | null;
  className?: string;
  describedBy?: string;
  children: ReactNode;
}) {
  // Server render and hydration use the server href; the browser then switches to its own
  // (a string, so the snapshot is stable between renders).
  const href = useSyncExternalStore(
    subscribe,
    () => browserHref(inquiry),
    () => whatsAppUrl(inquiryMessage(inquiry, serverOrigin)),
  );

  function refresh(event: MouseEvent<HTMLAnchorElement>) {
    event.currentTarget.href = browserHref(inquiry);
    reportHandoff(inquiry);
  }

  return (
    <a
      className={className}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-describedby={describedBy}
      onClick={refresh}
      data-inquiry={inquiry.kind === "vehicle" ? inquiry.intent : "general"}
    >
      {children}
    </a>
  );
}
