'use client';

import './globals.css';

interface GlobalErrorProps {
  error: unknown;
  retry: () => void;
}

/**
 * Shown when the root layout itself throws, so it replaces the whole page, including `<html>` and
 * `<body>`. Errors anywhere below the root layout use `app/error.tsx`. Server errors are reported by
 * `instrumentation.ts`.
 */
export default function GlobalError({ error, retry }: GlobalErrorProps) {
  const digest = error instanceof Error && 'digest' in error ? String(error.digest) : null;

  return (
    <html lang="en">
      <body>
        <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
          <h1 className="text-2xl font-semibold">Something went wrong</h1>
          <p>Please try again. If it keeps happening, contact support.</p>
          {digest && <p className="text-sm">Reference: {digest}</p>}
          <button type="button" onClick={retry} className="rounded-full border px-5 py-2 font-medium">
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
