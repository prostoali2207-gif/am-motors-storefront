"use client";

import { useSyncExternalStore, type MouseEvent, type ReactNode } from "react";

import { sendHandoffBeacon } from "@/attribution/handoff-beacon";
import { currentAttribution, currentPaidClick, handoffKey, paidHandoff } from "@/attribution/session-attribution";
import { inquiryMessage, type Inquiry } from "@/conversion/inquiry-message";
import { whatsAppUrl } from "@/conversion/whatsapp";

function actionOf(inquiry: Inquiry) {
  const vehicleId = inquiry.kind === "vehicle" ? inquiry.id : null;
  const intent = inquiry.kind === "vehicle" ? inquiry.intent : "general";
  return { vehicleId, intent, key: handoffKey(intent, vehicleId) } as const;
}

/**
 * The href shown before a tap carries no reference: a reference is created only when the visitor
 * actually taps (see `refresh`), so browsing pages creates none. Without a Google click (or with
 * the feature off) every href is exactly the pre-#19 message.
 */
function browserHref(inquiry: Inquiry, ref: string | null = null): string {
  return whatsAppUrl(inquiryMessage(inquiry, window.location.origin, currentAttribution(), ref));
}

/** At tap time: this action's own reference (issue #19) and its handoff record, if any. */
function hrefAtTap(inquiry: Inquiry): string {
  if (currentPaidClick() === null) return browserHref(inquiry);
  const action = actionOf(inquiry);
  const handoff = paidHandoff(action.key);
  if (handoff === null) return browserHref(inquiry);
  sendHandoffBeacon({
    key: action.key,
    handoff,
    vehicleId: action.vehicleId,
    intent: action.intent,
    locale: inquiry.locale,
    utm: currentAttribution(),
  });
  return browserHref(inquiry, handoff.ref);
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
    event.currentTarget.href = hrefAtTap(inquiry);
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
