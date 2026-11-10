import { type NextRequest, NextResponse } from 'next/server';

import { decodeRedirectPath, encodeRedirectPath } from '@/utils/redirect-path';

import { AUTH_REFRESH } from '@/constants/api';
import { COOKIE_NAMES } from '@/constants/cookie';
import {
  AFTER_LOGIN_ROUTE,
  CURRENT_PATH_HEADER,
  GUEST_ONLY_ROUTES,
  LOGIN_ROUTE,
  matchesRoute,
  PROTECTED_ROUTES,
  REFRESH_ROUTE,
} from '@/constants/routes';

/**
 * Runs before every page request (see `config.matcher`):
 *
 * - Sends logged-out users from `PROTECTED_ROUTES` to login, remembering the page.
 * - Sends logged-in users from `GUEST_ONLY_ROUTES` (the login page) onward.
 * - Refreshes an expired access token before the page renders: when only the refresh-token cookie is
 *   left, a page GET goes through `REFRESH_ROUTE`, which stores new tokens and comes back.
 * - Passes the current path to server code in the `x-current-path` header, so an expired session can
 *   return the user to the same page after login.
 *
 * "Logged in" here means an access-token or refresh-token cookie exists. Whether the token is still valid
 * is only known to the API: a rejected token gets a 401 on the first API call, which refreshes it or
 * ends the session.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasAccessToken = request.cookies.has(COOKIE_NAMES.ACCESS_TOKEN);
  const hasRefreshToken = AUTH_REFRESH !== null && request.cookies.has(COOKIE_NAMES.REFRESH_TOKEN);
  const isLoggedIn = hasAccessToken || hasRefreshToken;

  // Only page loads: server actions (POST) refresh inside handleRequest, where cookies can be set.
  if (!hasAccessToken && hasRefreshToken && request.method === 'GET') {
    const refreshUrl = new URL(REFRESH_ROUTE, request.url);
    const encoded = encodeRedirectPath(pathname + search);

    if (encoded) refreshUrl.searchParams.set('redirect', encoded);

    return NextResponse.redirect(refreshUrl);
  }

  if (!isLoggedIn && matchesRoute(pathname, PROTECTED_ROUTES)) {
    const loginUrl = new URL(LOGIN_ROUTE, request.url);
    const encoded = encodeRedirectPath(pathname + search);

    if (encoded) loginUrl.searchParams.set('redirect', encoded);

    return NextResponse.redirect(loginUrl);
  }

  if (isLoggedIn && matchesRoute(pathname, GUEST_ONLY_ROUTES)) {
    const requested = decodeRedirectPath(request.nextUrl.searchParams.get('redirect'));
    // A redirect back to a guest-only page would loop.
    const target =
      requested && !matchesRoute(new URL(requested, request.url).pathname, GUEST_ONLY_ROUTES)
        ? requested
        : AFTER_LOGIN_ROUTE;

    return NextResponse.redirect(new URL(target, request.url));
  }

  // Always overwrite, so a browser can't supply its own value.
  const requestHeaders = new Headers(request.headers);

  requestHeaders.set(CURRENT_PATH_HEADER, pathname + search);

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  // Pages and server actions only: not API routes, build assets, images or metadata files.
  matcher: ['/((?!api/|_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml|opengraph-image).*)'],
};
