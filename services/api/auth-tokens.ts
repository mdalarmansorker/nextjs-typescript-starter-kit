import 'server-only';

import { z } from 'zod';

import { AUTH_REFRESH, AUTH_REFRESH_TOKEN_IN } from '@/constants/api';

import { ApiError, readApiError } from './api-errors';
import { executeServerRequest } from './server-request';

/** The tokens of a logged-in user, as stored by `saveSession`. */
export interface Session {
  accessToken: string;
  /** Present when the API issues refresh tokens. */
  refreshToken?: string;
  /** Access token lifetime in seconds, when the API says. */
  expiresIn?: number;
  /** Refresh token lifetime in seconds, when the API says. */
  refreshExpiresIn?: number;
}

const ACCESS_TOKEN_KEYS = ['token', 'access_token', 'accessToken', 'access'];

/** Unwraps `{ status, data: { access_token, … } }`, the envelope many APIs put around every response. */
const unwrapEnvelope = (body: unknown): unknown => {
  if (typeof body !== 'object' || body === null) return body;

  const data: unknown = (body as Record<string, unknown>).data;
  const hasTokenAtTop = ACCESS_TOKEN_KEYS.some(key => key in body);

  return !hasTokenAtTop && typeof data === 'object' && data !== null ? data : body;
};

/** A non-empty string; anything else (missing, `null`, `''`) counts as not sent. */
const text = z.unknown().transform(value => (typeof value === 'string' && value !== '' ? value : undefined));

/** A positive number of seconds, also from a numeric string (`"3600"`); anything else counts as not sent. */
const seconds = z.unknown().transform(value => {
  const number = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;

  return typeof number === 'number' && Number.isFinite(number) && number > 0 ? number : undefined;
});

/**
 * The token response of login and refresh, under the names APIs commonly use:
 *
 * - access token: `token` (Laravel Sanctum), `access_token` (OAuth 2), `accessToken`, `access` (Django SimpleJWT)
 * - refresh token: `refresh_token`, `refreshToken`, `refresh`
 * - lifetimes in seconds: `expires_in`, `expiresIn`, `refresh_expires_in`, `refreshExpiresIn`
 *
 * The fields may also sit under `data` (`{ status, data: { access_token } }`). Optional fields that
 * are `null`, empty or malformed are ignored rather than failing the login. Change it if your API
 * sends something else.
 */
export const TokenResponseSchema = z
  .preprocess(
    unwrapEnvelope,
    z.object({
      token: text.optional(),
      access_token: text.optional(),
      accessToken: text.optional(),
      access: text.optional(),
      refresh_token: text.optional(),
      refreshToken: text.optional(),
      refresh: text.optional(),
      expires_in: seconds.optional(),
      expiresIn: seconds.optional(),
      refresh_expires_in: seconds.optional(),
      refreshExpiresIn: seconds.optional(),
    }),
  )
  .transform((data, ctx): Session => {
    const accessToken = data.access_token ?? data.accessToken ?? data.access ?? data.token;

    if (!accessToken) {
      ctx.addIssue({ code: 'custom', message: 'The response has no access token.' });

      return z.NEVER;
    }

    return {
      accessToken,
      refreshToken: data.refresh_token ?? data.refreshToken ?? data.refresh,
      expiresIn: data.expires_in ?? data.expiresIn,
      refreshExpiresIn: data.refresh_expires_in ?? data.refreshExpiresIn,
    };
  });

/** How long a refresh result is reused for requests that arrive with the same (now old) refresh token. */
const REUSE_MS = 10_000;

const recentRefreshes = new Map<string, { result: Promise<Session>; startedAt: number }>();

const sendRefresh = async (refreshToken: string): Promise<Session> => {
  if (!AUTH_REFRESH) {
    throw new ApiError('Token refresh is turned off (AUTH_REFRESH is null).', 400);
  }

  // AUTH_REFRESH_TOKEN_IN picks body or header; change this if your API expects something else.
  // This calls executeServerRequest, not handleRequest: handleRequest calls this on a 401.
  const result = await executeServerRequest(AUTH_REFRESH, {
    method: 'POST',
    ...(AUTH_REFRESH_TOKEN_IN === 'bearer'
      ? { headers: { Authorization: `Bearer ${refreshToken}` } }
      : { body: JSON.stringify({ refresh_token: refreshToken }) }),
    timeoutMs: 5_000,
  });

  if (!result.ok) {
    const { message, errors } = readApiError(result.data);

    throw new ApiError(message ?? 'The session could not be refreshed.', result.status, errors);
  }

  const parsed = TokenResponseSchema.safeParse(result.data);

  if (!parsed.success) {
    console.error('Unexpected refresh response from the API:', parsed.error);
    throw new ApiError('The API returned an unexpected response.', 502);
  }

  return parsed.data;
};

/**
 * Exchanges a refresh token for new tokens. Calls that arrive together with the same refresh token
 * (parallel requests, several tabs) share one API call. Without this, an API that rotates refresh
 * tokens would accept the first call and reject the rest as reuse, logging the user out.
 *
 * The sharing is per server process: with several instances, the API should allow a short grace
 * period for the previous refresh token.
 *
 * @throws {ApiError} When the API rejects the refresh token (4xx) or can't be reached.
 */
export const refreshTokens = (refreshToken: string): Promise<Session> => {
  const now = Date.now();

  for (const [token, entry] of recentRefreshes) {
    if (now - entry.startedAt > REUSE_MS) recentRefreshes.delete(token);
  }

  const existing = recentRefreshes.get(refreshToken);

  if (existing) return existing.result;

  const result = sendRefresh(refreshToken);

  recentRefreshes.set(refreshToken, { result, startedAt: now });
  // A failure isn't reused: the next request may try again (e.g. after a timeout).
  result.catch(() => recentRefreshes.delete(refreshToken));

  return result;
};
