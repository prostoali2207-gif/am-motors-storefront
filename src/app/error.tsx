"use client";

// Error boundaries must be Client Components. Server error details are not shown to users;
// Next.js replaces them with a digest in production.
export default function Error({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
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
