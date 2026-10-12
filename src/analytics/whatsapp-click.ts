import type { Inquiry } from "@/conversion/inquiry-message";

/**
 * First-party event interface for a future Google Tag Manager conversion tag.
 * This records a CLICK only: WhatsApp might never open, and no message/sale is confirmed.
 * No PII, VIN, message body, price, URL query or click IDs are collected here.
 */
export function recordWhatsAppClick(inquiry: Inquiry): void {
  if (typeof window === "undefined") return;

  const dataWindow = window as Window & { dataLayer?: Record<string, string>[] };
  const event: Record<string, string> = {
    event: "am_whatsapp_click",
    inquiry_type: inquiry.kind === "general" ? "general" : inquiry.intent,
    page_path: window.location.pathname,
  };
  if (inquiry.kind === "vehicle") event.vehicle_id = inquiry.id;

  dataWindow.dataLayer ??= [];
  dataWindow.dataLayer.push(event);
}
