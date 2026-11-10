import type { Instrumentation } from 'next';

/**
 * Called once when the server starts, before it handles requests. Checks the environment variables
 * (`utils/validate-env.ts`), so a missing `API_URL` or a malformed key stops the server with a list of
 * what's wrong. Skipped during `next build`, which runs without the runtime secrets.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs' || process.env.NEXT_PHASE === 'phase-production-build') {
    return;
  }

  const { assertValidEnv } = await import('./utils/validate-env');

  assertValidEnv(process.env);
}

/**
 * Called by Next.js for every error thrown while rendering a page, running a server action or route
 * handler, or in the proxy. This is the one place to send server errors to a reporting service.
 *
 * To use Sentry (or similar), call its capture function here, e.g. `Sentry.captureRequestError(...)`.
 * Until then errors are logged as one JSON line, which log tools can search and alert on.
 */
export const onRequestError: Instrumentation.onRequestError = (error, request, context) => {
  console.error(
    JSON.stringify({
      level: 'error',
      message: error instanceof Error ? error.message : String(error),
      // Matches the "Reference" shown to the user on the error page.
      digest: error instanceof Error && 'digest' in error ? error.digest : undefined,
      stack: error instanceof Error ? error.stack : undefined,
      method: request.method,
      path: request.path,
      routePath: context.routePath,
      routeType: context.routeType,
      // Request headers are left out on purpose: they include cookies with access tokens.
    }),
  );
};
