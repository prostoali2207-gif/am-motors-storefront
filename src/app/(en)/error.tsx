"use client";

import type { ErrorInfo } from "next/error";

import { ErrorView } from "@/components/error-view";

// Error boundaries must be Client Components. `retry` re-fetches and re-renders the segment
// (Next.js 16.3). Server error details are never shown to users.
export default function Error({ retry }: ErrorInfo) {
  return <ErrorView locale="en" retry={retry} />;
}
