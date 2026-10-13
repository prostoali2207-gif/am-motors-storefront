"use client";

import { useSyncExternalStore, type MouseEvent, type ReactNode } from "react";

import { currentAttribution } from "@/attribution/session-attribution";
import { recordWhatsAppClick } from "@/analytics/whatsapp-click";
import { reportGoogleAdsWhatsAppClick } from "@/analytics/google-ads-measurement";
import { inquiryMessage, type Inquiry } from "@/conversion/inquiry-message";
import { supportsWhatsAppMessengerIntent, whatsAppMessengerIntentUrl, whatsAppUrl } from "@/conversion/whatsapp";

function browserHref(inquiry: Inquiry): string {
  const message = inquiryMessage(inquiry, window.location.origin, currentAttribution());
  return supportsWhatsAppMessengerIntent(window.navigator.userAgent)
    ? whatsAppMessengerIntentUrl(message)
    : whatsAppUrl(message);
}

/** Location and session attribution do not change while a page is shown; no subscription needed. */
const subscribe = () => () => {};

/**
 * A prefilled inquiry link. Server rendering and non-Chrome browsers use standard wa.me;
 * Chrome on Android opens regular WhatsApp Messenger directly via its package-specific intent.
 * The href is rebuilt at click time to retain first-touch attribution. The click remains a
 * native user gesture, required by Chrome to launch an Android app. No message is sent
 * until the customer explicitly sends it in WhatsApp.
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
  const href = useSyncExternalStore(
    subscribe,
    () => browserHref(inquiry),
    () => whatsAppUrl(inquiryMessage(inquiry, serverOrigin)),
  );

  function refresh(event: MouseEvent<HTMLAnchorElement>) {
    const nextHref = browserHref(inquiry);
    event.currentTarget.href = nextHref;
    event.currentTarget.target = nextHref.startsWith("intent://") ? "_self" : "_blank";
    recordWhatsAppClick(inquiry);
    reportGoogleAdsWhatsAppClick();
  }

  return (
    <a
      className={className}
      href={href}
      target={href.startsWith("intent://") ? "_self" : "_blank"}
      rel="noopener noreferrer"
      aria-describedby={describedBy}
      onClick={refresh}
      data-inquiry={inquiry.kind === "vehicle" ? inquiry.intent : "general"}
    >
      {children}
    </a>
  );
}
