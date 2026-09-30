"use client";

import type { ErrorInfo } from "next/error";

// Error boundaries must be Client Components. `ErrorInfo` is the official prop type for the
// installed Next.js (16.3.x): `retry` re-fetches and re-renders the segment (stable since
// 16.3.0, replacing 16.2's `unstable_retry`). Server error details are never shown to users.
export default function Error({ retry }: ErrorInfo) {
  return (
    <section className="notice" role="alert">
      <h1>Something went wrong</h1>
      <p>Please try again.</p>
      <button type="button" onClick={() => retry()}>
        Try again
      </button>
    </section>
  );
}
