"use client";

import { useEffect } from "react";

import { currentAttribution, currentPaidClick, setInquiryRefsEnabled } from "@/attribution/session-attribution";

/**
 * Records first-touch attribution from the landing URL for this tab session. Renders nothing,
 * loads no third-party code, sets no cookies. See src/attribution/.
 *
 * `inquiryRefs` comes from the server (src/inquiry-log/config.ts). While false — the default — no
 * click ID is read or stored and no reference is ever shown (issue #19, pending owner approval).
 */
export function AttributionCapture({ inquiryRefs = false }: { inquiryRefs?: boolean }) {
  useEffect(() => {
    setInquiryRefsEnabled(inquiryRefs);
    currentAttribution();
    currentPaidClick();
  }, [inquiryRefs]);
  return null;
}
