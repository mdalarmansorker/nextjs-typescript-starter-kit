import { redirect } from 'next/navigation';
import { type NextRequest } from 'next/server';

import { decodeRedirectPath, encodeRedirectPath } from '@/utils/redirect-path';

import { refreshSession } from '@/services/app/session.service';

/**
 * Refreshes the access token, then sends the user back to `?redirect=` (or `/`). Server Components
 * can't set cookies, so the proxy and `handleRequest` send page requests here when the access token
 * is missing or expired and a refresh token is stored.
 *
 * When the API rejects the refresh token, the session ends through `/api/auth/clear`, which sends the
 * user to login. When the API can't be reached the error propagates (a 500, logged by
 * `instrumentation.ts`) instead of redirecting back to a page that would land here again.
 */
export async function GET(request: NextRequest) {
  // Only same-origin paths: `decodeRedirectPath` drops anything else.
  const target = decodeRedirectPath(request.nextUrl.searchParams.get('redirect'));

  if (await refreshSession()) {
    redirect(target ?? '/');
  }

  const encoded = target ? encodeRedirectPath(target) : null;

  redirect(encoded ? `/api/auth/clear?redirect=${encoded}` : '/api/auth/clear');
}
