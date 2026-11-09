import { redirect } from 'next/navigation';

import { encryptRedirectUrl } from '@/utils/redirect-encryption';

import { executeServerRequest } from './server-request';

interface RequestOptions extends RequestInit {
  requiresAuth?: boolean;
  cachedRead?: boolean;
  revalidateTags?: string[];
}

const clearAuthAndLogout = () => {
  if (typeof window !== 'undefined') {
    const currentPath = window.location.pathname + window.location.search;
    const clearUrl = new URL('/api/auth/clear', window.location.origin);

    if (currentPath && !currentPath.startsWith('/api/auth/clear') && !currentPath.startsWith('/login')) {
      const encryptedRedirect = encryptRedirectUrl(currentPath);

      if (encryptedRedirect) {
        clearUrl.searchParams.set('redirect', encryptedRedirect);
      }
    }

    window.location.href = clearUrl.toString();
  } else {
    redirect('/api/auth/clear');
  }
};

/**
 * Generic API request handler.
 *
 * Sends a request using `apiInterceptor`, parses JSON response,
 * handles API/HTTP errors, and optionally revalidates Next.js cache tags.
 *
 * @template T Expected response type
 * @param slug API endpoint path (appended to API_URL)
 * @param options Fetch options + { requiresAuth?, revalidateTags? }
 * @param mode 'normal' (default) → throws Error, 'raw' → throws original API error
 *
 * @returns Parsed API response
 *
 * @example
 * await handleRequest('/projects', {
 *   requiresAuth: true,
 *   method: 'POST',
 *   body: JSON.stringify(data),
 *   revalidateTags: ['projects']
 * });
 * // Output: { status: 'success', message: 'Project created' }
 *
 * @example
 * await handleRequest('/login', { method: 'POST' }, 'raw');
 * // Output (Laravel validation error):
 * // {
 * //   message: "The given data was invalid.",
 * //   errors: {
 * //     name: ["The name field is required."],
 * //     email: ["The email must be a valid email address."]
 * //   }
 * //   }
 * // }
 */
export const handleRequest = async <T = unknown>(
  slug: string,
  options: RequestOptions = {},
  mode: 'normal' | 'raw' = 'normal',
): Promise<T> => {
  const result = await executeServerRequest<T>(slug, options);

  if (!result.ok) {
    if (result.status === 401 && options.requiresAuth) {
      clearAuthAndLogout();
    }

    if (mode === 'raw') {
      throw result.data;
    }

    throw new Error(result.data?.message ?? 'Something went wrong');
  }

  return result.data as T;
};
