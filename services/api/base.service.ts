import 'server-only';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { encodeRedirectPath } from '@/utils/redirect-path';

import { canSaveSession, getRefreshToken, refreshSession } from '@/services/app/session.service';

import { CURRENT_PATH_HEADER, REFRESH_ROUTE } from '@/constants/routes';

import { ApiError, readApiError } from './api-errors';
import { executeServerRequest, type RequestOptions } from './server-request';

export interface HandleRequestOptions<T> extends RequestOptions {
  /**
   * Checks the response body and returns it typed, or throws when it has the wrong shape. Without it
   * the body is only cast to `T`. Works with any schema library, e.g. `parse: data => UserSchema.parse(data)`.
   */
  parse?: (data: unknown) => T;
  /**
   * On a 401 for a `requiresAuth` request, refresh the token or end the session (default). Set to
   * `false` to get the `ApiError` instead, e.g. for a logout call whose token may already be invalid.
   */
  endSessionOn401?: boolean;
}

/** `route?redirect=<current page>`, or just `route` outside a page request. */
const withReturnPath = async (route: string): Promise<string> => {
  let currentPath: string | null = null;

  try {
    // Set by proxy.ts for pages and server actions.
    currentPath = (await headers()).get(CURRENT_PATH_HEADER);
  } catch {
    // Outside a request there is no page to return to.
  }

  const encoded = currentPath ? encodeRedirectPath(currentPath) : null;

  return encoded ? `${route}?redirect=${encoded}` : route;
};

/**
 * Ends the session after the API rejected the token: deletes the auth cookies through
 * `/api/auth/clear`, which then sends the user to login with the current page to come back to.
 */
const endSession = async (): Promise<never> => redirect(await withReturnPath('/api/auth/clear'));

/**
 * Handles a 401 on a `requiresAuth` request. Returns `true` when the token was refreshed and the
 * request can be retried; otherwise redirects.
 *
 * - No refresh token: ends the session.
 * - Server action or route handler: refreshes here. If the API rejects the refresh token, ends the session.
 * - Server Component (cookies are read-only): redirects to `REFRESH_ROUTE`, which refreshes and comes back.
 */
const recoverSession = async (): Promise<true> => {
  if (!(await getRefreshToken())) {
    return endSession();
  }

  if (!(await canSaveSession())) {
    return redirect(await withReturnPath(REFRESH_ROUTE));
  }

  return (await refreshSession()) || endSession();
};

/**
 * Sends a request to the backend API. Server-only: call it from Server Components, server actions and
 * route handlers. Client components call a server action that calls this.
 *
 * @template T Expected response type
 * @param slug API path, appended to `API_URL` (`/projects/1`)
 * @param options `fetch` options plus `requiresAuth`, `query`, `revalidateTags`, `cachedRead`, `timeoutMs`,
 *   `parse`, `endSessionOn401`
 * @returns The parsed response body
 * @throws {ApiError} For any failure, with `status`, the API's `message` and its field `errors`.
 *   A 401 on a `requiresAuth` request refreshes the token and retries once when there is a refresh
 *   token, and otherwise ends the session and redirects to login.
 *
 * @example
 * const project = await handleRequest<Project>('/projects/1', { requiresAuth: true });
 *
 * @example
 * const page = await handleRequest('/projects', { requiresAuth: true, query: { page: 2, status: 'active' } });
 *
 * @example
 * await handleRequest('/projects', {
 *   requiresAuth: true,
 *   method: 'POST',
 *   body: JSON.stringify(data),
 *   revalidateTags: ['projects'],
 * });
 */
export const handleRequest = async <T = unknown>(slug: string, options: HandleRequestOptions<T> = {}): Promise<T> => {
  const { parse, endSessionOn401 = true, ...requestOptions } = options;
  const handlesExpiry = options.requiresAuth && endSessionOn401;
  let result = await executeServerRequest<unknown>(slug, requestOptions);

  if (!result.ok && result.status === 401 && handlesExpiry) {
    await recoverSession();
    result = await executeServerRequest<unknown>(slug, requestOptions);

    // Refused again right after a refresh: end the session instead of looping.
    if (!result.ok && result.status === 401) await endSession();
  }

  if (!result.ok) {
    const { message, errors } = readApiError(result.data);

    throw new ApiError(message ?? 'Something went wrong', result.status, errors);
  }

  if (!parse) {
    return result.data as T;
  }

  try {
    return parse(result.data);
  } catch (error) {
    // The details (e.g. which field was wrong) are for the logs, not the user.
    console.error(`Unexpected response from the API for ${slug}:`, error);
    throw new ApiError('The API returned an unexpected response.', 502);
  }
};
