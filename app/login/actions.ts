'use server';

import { redirect } from 'next/navigation';

import { z } from 'zod';

import { decodeRedirectPath } from '@/utils/redirect-path';

import { ApiError } from '@/services/api/api-errors';
import AuthService from '@/services/api/auth.service';
import { saveSession } from '@/services/app/session.service';

import { AFTER_LOGIN_ROUTE } from '@/constants/routes';

export interface LoginState {
  message?: string;
  fieldErrors?: Partial<Record<'email' | 'password', string[]>>;
  /** What the user typed, so the form keeps it after an error. Never includes the password. */
  email?: string;
}

const LoginSchema = z.object({
  email: z.email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
});

/**
 * Logs the user in and sends them to the page they wanted, or AFTER_LOGIN_ROUTE.
 *
 * Errors are returned, not thrown: in production Next.js hides the message of an error thrown in a
 * server action, so the form could only show "something went wrong".
 */
export async function login(_previous: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get('email') ?? '');
  const parsed = LoginSchema.safeParse({ email, password: formData.get('password') });

  if (!parsed.success) {
    return { email, fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  try {
    const { token } = await AuthService.login(parsed.data);

    await saveSession(token);
  } catch (error) {
    if (error instanceof ApiError && error.status < 500) {
      // The API's own message and field errors, e.g. "These credentials do not match our records."
      return {
        email,
        message: error.message,
        fieldErrors: (error.errors as LoginState['fieldErrors']) ?? undefined,
      };
    }

    // Server-side problems (API down, timeout, bad response) are logged; the user gets a plain message.
    console.error('Login failed:', error);

    return { email, message: 'Login is unavailable right now. Please try again in a moment.' };
  }

  // Outside the try: redirect() works by throwing, and the catch above would swallow it.
  redirect(decodeRedirectPath(formData.get('redirect')?.toString()) ?? AFTER_LOGIN_ROUTE);
}
