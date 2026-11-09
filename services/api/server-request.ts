'use server';

import { updateTag } from 'next/cache';
import { unstable_rethrow } from 'next/navigation';

import { getErrorMessage, hasProperty } from '@/utils/helpers';

import { API_URL } from '@/constants/api';

import apiInterceptor from './api.interceptor';

interface ApiError {
  status: 'error';
  message: string;
  errors: unknown;
}

interface ErrorResponse {
  ok: false;
  status: number;
  data: ApiError;
}

interface DataResponse<T> {
  ok: true;
  status: number;
  data: T;
}

type ServerResponse<T> = DataResponse<T> | ErrorResponse;

interface RequestOptions extends RequestInit {
  requiresAuth?: boolean;
  cachedRead?: boolean;
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

export const executeServerRequest = async <T = unknown>(
  slug: string,
  options: RequestOptions = {},
): Promise<ServerResponse<T>> => {
  const { revalidateTags, ...fetchOptions } = options;

  try {
    const response = await apiInterceptor(API_URL + slug, fetchOptions);
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
        data: responseData as ApiError,
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
