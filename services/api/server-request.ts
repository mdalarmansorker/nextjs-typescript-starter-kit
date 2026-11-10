import 'server-only';

import { updateTag } from 'next/cache';
import { unstable_rethrow } from 'next/navigation';

import { getErrorMessage, hasProperty } from '@/utils/helpers';

import { API_URL } from '@/constants/api';

import apiInterceptor, { type ApiInterceptorOptions } from './api.interceptor';

interface ApiErrorBody {
  status: 'error';
  message: string;
  errors: unknown;
}

interface ErrorResponse {
  ok: false;
  status: number;
  data: ApiErrorBody;
}

interface DataResponse<T> {
  ok: true;
  status: number;
  data: T;
}

type ServerResponse<T> = DataResponse<T> | ErrorResponse;

export interface RequestOptions extends ApiInterceptorOptions {
  /** Cache tags to clear after a successful request. Only works in server actions and route handlers. */
  revalidateTags?: string[];
}

const revalidateCacheTags = (tags: string[]) => {
  for (const tag of tags) {
    try {
      updateTag(tag);
    } catch (error) {
      console.error(`Failed to revalidate cache tag "${tag}":`, error);
    }
  }
};

/** A request this app refuses to send; reported to the caller as a 400. */
class ApiRequestError extends Error {
  status = 400;
}

/**
 * Joins `API_URL` and a slug, and makes sure the result stays inside `API_URL`.
 *
 * A slug can come from user input (`/users/${id}`). Without this check `/../admin` would leave the
 * API's base path, and `@evil.example` would turn `API_URL`'s host into a username and send the
 * request (and the user's token) to another server.
 */
const buildApiUrl = (slug: string): URL => {
  if (!API_URL) {
    throw new Error('API_URL is not set. Add it to your environment (see .env.example).');
  }

  const base = new URL(API_URL);
  const basePath = base.pathname.replace(/\/+$/, '');

  if (!slug.startsWith('/') || slug.startsWith('//')) {
    throw new ApiRequestError(`Invalid API path "${slug}": it must start with a single "/".`);
  }

  const url = new URL(basePath + slug, base.origin);

  if (url.origin !== base.origin || !(url.pathname === basePath || url.pathname.startsWith(`${basePath}/`))) {
    throw new ApiRequestError(`Invalid API path "${slug}": it leaves API_URL.`);
  }

  return url;
};

const isTimeout = (error: unknown): boolean => hasProperty(error, 'name') && error.name === 'TimeoutError';

/**
 * Sends a request to the API and returns the result instead of throwing.
 *
 * Server-only. Use `handleRequest` from `base.service.ts`, which turns failures into `ApiError`s.
 */
export const executeServerRequest = async <T = unknown>(
  slug: string,
  options: RequestOptions = {},
): Promise<ServerResponse<T>> => {
  const { revalidateTags, ...fetchOptions } = options;

  try {
    const response = await apiInterceptor(buildApiUrl(slug).href, fetchOptions);
    let responseData: unknown;

    try {
      responseData = await response.json();
    } catch {
      responseData = null;
    }

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        data: responseData as ApiErrorBody,
      };
    }

    if (revalidateTags?.length) {
      revalidateCacheTags(revalidateTags);
    }

    return {
      ok: true,
      status: response.status,
      data: responseData as T,
    };
  } catch (error) {
    // Redirects and the build's prerender postponement (`cookies()` / `connection()`) must reach
    // Next.js; wrapped into an error result they lose their identity and get logged as failures.
    unstable_rethrow(error);

    if (isTimeout(error)) {
      return {
        ok: false,
        status: 504,
        data: { status: 'error', message: 'The API did not respond in time.', errors: null },
      };
    }

    return {
      ok: false,
      status: hasProperty(error, 'status') && typeof error.status === 'number' ? error.status : 500,
      data: {
        status: 'error',
        message: getErrorMessage(error),
        errors: hasProperty(error, 'errors') && typeof error.errors === 'object' ? error.errors : null,
      },
    };
  }
};
