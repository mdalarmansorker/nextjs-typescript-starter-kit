import 'server-only';

import { ApiError } from '@/services/api/api-errors';
import { refreshTokens, type Session } from '@/services/api/auth-tokens';

import { AUTH_REFRESH } from '@/constants/api';
import { AUTH_COOKIES_DURATION_DAYS, COOKIE_NAMES, COOKIE_SECURE } from '@/constants/cookie';

import CookieService from './cookie.service';

export type { Session };

/** The access cookie expires this much before the token, so it is refreshed before the API rejects it. */
const EXPIRY_MARGIN_SECONDS = 30;

const cookieOptions = (expires: number | Date) =>
  ({ expires, httpOnly: true, secure: COOKIE_SECURE, sameSite: 'lax', path: '/' }) as const;

const accessCookieExpiry = (expiresIn: number | undefined): number | Date => {
  if (!expiresIn) return AUTH_COOKIES_DURATION_DAYS;

  const seconds = expiresIn > EXPIRY_MARGIN_SECONDS * 2 ? expiresIn - EXPIRY_MARGIN_SECONDS : expiresIn;

  return new Date(Date.now() + seconds * 1000);
};

/**
 * Stores the tokens after login or refresh. Call it from a server action or route handler: cookies
 * can't be set while a Server Component renders.
 *
 * Both cookies are `httpOnly`, so page scripts (and any injected script) can't read the tokens. The
 * access cookie expires with the token (`expiresIn`), which lets the proxy refresh it before the next
 * page needs it. A response without a refresh token keeps the one already stored.
 */
export const saveSession = async ({ accessToken, refreshToken, expiresIn }: Session): Promise<void> => {
  await CookieService.store(COOKIE_NAMES.ACCESS_TOKEN, accessToken, cookieOptions(accessCookieExpiry(expiresIn)));

  if (refreshToken) {
    await CookieService.store(COOKIE_NAMES.REFRESH_TOKEN, refreshToken, cookieOptions(AUTH_COOKIES_DURATION_DAYS));
  }
};

/** The stored refresh token, when token refresh is on (`AUTH_REFRESH`). */
export const getRefreshToken = async (): Promise<string | undefined> =>
  AUTH_REFRESH ? CookieService.get(COOKIE_NAMES.REFRESH_TOKEN) : undefined;

/**
 * True in server actions and route handlers, false while a Server Component renders (where Next.js
 * makes cookies read-only). Checked before refreshing: an API that rotates refresh tokens invalidates
 * the old one, so new tokens that can't be stored would end the session.
 *
 * Tests by storing the current refresh token again, which changes nothing that matters.
 */
export const canSaveSession = async (): Promise<boolean> => {
  const refreshToken = await getRefreshToken();

  if (!refreshToken) return false;

  try {
    await CookieService.store(COOKIE_NAMES.REFRESH_TOKEN, refreshToken, cookieOptions(AUTH_COOKIES_DURATION_DAYS));

    return true;
  } catch {
    return false;
  }
};

/**
 * Exchanges the refresh token for new tokens and stores them. Call it where cookies can be set (see
 * `canSaveSession`).
 *
 * @returns `true` when refreshed, `false` when there is no refresh token or the API rejected it (4xx):
 *   the session is over.
 * @throws {ApiError} When the API can't be reached or answers with a 5xx, so a short outage doesn't log
 *   everyone out.
 */
export const refreshSession = async (): Promise<boolean> => {
  const refreshToken = await getRefreshToken();

  if (!refreshToken) return false;

  try {
    await saveSession(await refreshTokens(refreshToken));

    return true;
  } catch (error) {
    if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
      return false;
    }

    throw error;
  }
};
