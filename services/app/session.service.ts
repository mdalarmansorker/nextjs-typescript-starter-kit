import 'server-only';

import { AUTH_COOKIES_DURATION_DAYS, COOKIE_NAMES, COOKIE_SECURE } from '@/constants/cookie';

import CookieService from './cookie.service';

/**
 * Stores the access token after login. Call it from a server action or route handler: cookies can't be
 * set while a Server Component renders.
 *
 * The cookie is `httpOnly`, so page scripts (and any injected script) can't read the token.
 */
export const saveSession = async (accessToken: string): Promise<void> => {
  await CookieService.store(COOKIE_NAMES.ACCESS_TOKEN, accessToken, {
    expires: AUTH_COOKIES_DURATION_DAYS,
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: 'lax',
    path: '/',
  });
};
