"use client";

import { useEffect } from "react";

import { currentAttribution } from "@/attribution/session-attribution";

/**
 * Records first-touch attribution from the landing URL for this tab session. Renders nothing,
 * loads no third-party code, sets no cookies. See src/attribution/.
 */
export function AttributionCapture() {
  useEffect(() => {
    currentAttribution();
  }, []);
  return null;
}
