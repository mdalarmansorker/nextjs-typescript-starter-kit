import 'server-only';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { encodeRedirectPath } from '@/utils/redirect-path';

import { CURRENT_PATH_HEADER } from '@/constants/routes';

import { ApiError } from './api-errors';
import { executeServerRequest, type RequestOptions } from './server-request';

export interface HandleRequestOptions<T> extends RequestOptions {
  /**
   * Checks the response body and returns it typed, or throws when it has the wrong shape. Without it
   * the body is only cast to `T`. Works with any schema library, e.g. `parse: data => UserSchema.parse(data)`.
   */
  parse?: (data: unknown) => T;
}

/**
 * Ends the session after the API rejected the token: deletes the auth cookies through
 * `/api/auth/clear`, which then sends the user to login with the current page to come back to.
 */
const endSession = async (): Promise<never> => {
  let currentPath: string | null = null;

  try {
    // Set by proxy.ts for pages and server actions.
    currentPath = (await headers()).get(CURRENT_PATH_HEADER);
  } catch {
    // Outside a request there is no page to return to.
  }

  const encoded = currentPath ? encodeRedirectPath(currentPath) : null;

  redirect(encoded ? `/api/auth/clear?redirect=${encoded}` : '/api/auth/clear');
};

/**
 * Sends a request to the backend API. Server-only: call it from Server Components, server actions and
 * route handlers. Client components call a server action that calls this.
 *
 * @template T Expected response type
 * @param slug API path, appended to `API_URL` (`/projects/1`)
 * @param options `fetch` options plus `requiresAuth`, `revalidateTags`, `cachedRead`, `timeoutMs`, `parse`
 * @returns The parsed response body
 * @throws {ApiError} For any failure, with `status`, the API's `message` and its field `errors`.
 *   A 401 on a `requiresAuth` request ends the session and redirects to login instead.
 *
 * @example
 * const project = await handleRequest<Project>('/projects/1', { requiresAuth: true });
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
  const { parse, ...requestOptions } = options;
  const result = await executeServerRequest<unknown>(slug, requestOptions);

  if (!result.ok) {
    if (result.status === 401 && options.requiresAuth) {
      await endSession();
    }

    throw new ApiError(result.data?.message ?? 'Something went wrong', result.status, result.data?.errors);
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
