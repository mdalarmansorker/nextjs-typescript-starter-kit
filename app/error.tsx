'use client';

import { useEffect } from 'react';

interface ErrorPageProps {
  /** Errors from Server Components arrive as an Error with only a generic message and a `digest` in production. */
  error: unknown;
  /** Re-fetches and re-renders the segment. */
  retry: () => void;
}

/**
 * Shown when a page or layout below the root layout throws. Errors in the root layout itself need
 * `app/global-error.tsx`.
 */
export default function ErrorPage({ error, retry }: ErrorPageProps) {
  useEffect(() => {
    // Replace with your error reporting service (Sentry, etc.).
    console.error(error);
  }, [error]);

  const digest = error instanceof Error && 'digest' in error ? String(error.digest) : null;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="text-zinc-600 dark:text-zinc-400">Please try again. If it keeps happening, contact support.</p>
      {digest && <p className="text-sm text-zinc-500">Reference: {digest}</p>}
      <button
        type="button"
        onClick={retry}
        className="rounded-full bg-foreground px-5 py-2 font-medium text-background transition-colors hover:opacity-90"
      >
        Try again
      </button>
    </main>
  );
}
