import { type NextRequest, NextResponse } from 'next/server';

import AuthService from '@/services/api/auth.service';

import { COOKIE_NAMES } from '@/constants/cookie';
import { LOGIN_ROUTE } from '@/constants/routes';

/**
 * True when the request was started by another site (a link, image or form on evil.example).
 * Browsers set `Sec-Fetch-Site`; `none` means the user typed the URL or used a bookmark. Requests
 * without the header (old browsers, curl) are allowed, since they can't come from another site's page.
 */
const isCrossSite = (request: NextRequest): boolean => {
  const site = request.headers.get('sec-fetch-site');

  return site !== null && site !== 'same-origin' && site !== 'none';
};

/**
 * Deletes the auth cookies and redirects: to `/login?redirect=…` when a redirect was given, else to `/`.
 * Requests from other sites are redirected without deleting anything, so another site can't log
 * users out by embedding this URL.
 */
const endSession = (request: NextRequest, status: 303 | 307): NextResponse => {
  const url = new URL(request.url);
  const redirectParam = url.searchParams.get('redirect');
  let redirectUrl: URL;

  if (redirectParam) {
    redirectUrl = new URL(LOGIN_ROUTE, url.origin);
    redirectUrl.searchParams.set('redirect', redirectParam);
  } else {
    redirectUrl = new URL('/', url.origin);
  }

  const res = NextResponse.redirect(redirectUrl, status);

  if (isCrossSite(request)) {
    return res;
  }

  Object.values(COOKIE_NAMES).forEach(name => {
    res.cookies.delete(name);
  });

  return res;
};

/** Used by `handleRequest` when the API rejects the token. */
export function GET(request: NextRequest) {
  return endSession(request, 307);
}

/**
 * For logout buttons: `<form method="post" action="/api/auth/clear">`. Revokes the token on the API
 * first (see `AuthService.logout`); the cookies are deleted even when that fails, so logout always works.
 */
export async function POST(request: NextRequest) {
  if (!isCrossSite(request) && request.cookies.has(COOKIE_NAMES.ACCESS_TOKEN)) {
    try {
      await AuthService.logout();
    } catch (error) {
      console.error('Revoking the token on the API failed:', error);
    }
  }

  // 303 turns the POST into a GET of the redirect target.
  return endSession(request, 303);
}
