import 'server-only';

import { z } from 'zod';

import { AUTH_LOGIN, AUTH_LOGOUT } from '@/constants/api';

import { handleRequest } from './base.service';

/**
 * The login response. Change it to match your API: Laravel Sanctum, for example, returns
 * `{ token: string }`, others `{ access_token, refresh_token, expires_in }`.
 */
const LoginResponseSchema = z.object({
  token: z.string().min(1),
});

export type LoginResponse = z.infer<typeof LoginResponseSchema>;

export interface LoginPayload {
  email: string;
  password: string;
}

export default class AuthService {
  static login = (payload: LoginPayload) =>
    handleRequest<LoginResponse>(AUTH_LOGIN, {
      method: 'POST',
      body: JSON.stringify(payload),
      parse: data => LoginResponseSchema.parse(data),
    });

  /**
   * Revokes the current token on the API, so a copied token stops working too. Does nothing when
   * `AUTH_LOGOUT` is `null`. A 401 throws instead of redirecting: the token may already be invalid.
   */
  static logout = async (): Promise<void> => {
    if (!AUTH_LOGOUT) return;

    await handleRequest(AUTH_LOGOUT, {
      method: 'POST',
      requiresAuth: true,
      endSessionOn401: false,
      // Logging out must not wait on a slow API for long.
      timeoutMs: 5_000,
    });
  };
}
