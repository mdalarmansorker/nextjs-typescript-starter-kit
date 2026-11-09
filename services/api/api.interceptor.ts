import { connection } from 'next/server';

import { getClientIp } from '@/utils/client-ip.server';

import { COOKIE_NAMES } from '@/constants/cookie';

import CookieService from '../app/cookie.service';

import { ApiError } from './api-errors';

interface ApiInterceptorOptions extends RequestInit {
  requiresAuth?: boolean;
  /** Set on reads that run inside `use cache: private`, where `connection()` is not allowed. */
  cachedRead?: boolean;
}

/**
 * API interceptor that attaches the access token to authenticated requests.
 *
 * Throws a 401 error when authentication is required but no access token
 * is available, or when the API responds with 401.
 */
const apiInterceptor = async (url: string, options: ApiInterceptorOptions = {}): Promise<Response> => {
  const { requiresAuth = false, cachedRead = false, ...fetchOptions } = options;

  // Read tokens
  const accessToken = requiresAuth ? ((await CookieService.get(COOKIE_NAMES.ACCESS_TOKEN)) ?? null) : null;

  // Authentication is required but no access token is available.
  if (requiresAuth && !accessToken) {
    throw new ApiError('Authentication failed. Please log in again.', 401);
  }

  // Prepare headers
  const headers = new Headers(fetchOptions.headers);

  headers.set('Accept', 'application/json');

  if (!(fetchOptions.body && fetchOptions.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (requiresAuth && accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  // Actions (login, password reset…) are limited per visitor address by the API: pass it on.
  // Reads leave it out, so cached / prerendered pages don't depend on the request.
  if ((fetchOptions.method ?? 'GET').toUpperCase() !== 'GET') {
    const clientIp = await getClientIp();

    if (clientIp) headers.set('X-Forwarded-For', clientIp);
  }

  // A request to the API is request-time work. Saying so before it starts lets Next.js render the
  // rest of the page at request time too; otherwise the clock reads `fetch` makes when the body
  // arrives count as an unstable `Date.now()` in the prerendered part, an error in development.
  if (!cachedRead) {
    await connection();
  }

  const response = await fetch(url, {
    ...fetchOptions,
    headers,
  });

  // Convert authenticated 401 responses into an authentication error.
  if (response.status === 401 && requiresAuth) {
    throw new ApiError('Authentication failed. Please log in again.', 401);
  }

  return response;
};

export default apiInterceptor;
