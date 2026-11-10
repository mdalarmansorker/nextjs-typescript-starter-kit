import 'server-only';

import { AUTH_LOGIN, AUTH_LOGOUT } from '@/constants/api';

import { type Session, TokenResponseSchema } from './auth-tokens';
import { handleRequest } from './base.service';

export interface LoginPayload {
  email: string;
  password: string;
}

export default class AuthService {
  static login = (payload: LoginPayload) =>
    handleRequest<Session>(AUTH_LOGIN, {
      method: 'POST',
      // TEST SETUP (academy backend): it logs in with `username` (phone or email) and a `mode`. Revert before committing.
      body: JSON.stringify({ username: payload.email, password: payload.password, mode: 'classroom' }),
      // Accepts the common token response shapes; see TokenResponseSchema to adapt it to your API.
      parse: data => TokenResponseSchema.parse(data),
    });

  /**
   * Revokes the current token on the API, so a copied token stops working too. The refresh token, if
   * any, is sent in the body so the API can revoke it as well. Does nothing when `AUTH_LOGOUT` is
   * `null`. A 401 throws instead of redirecting: the token may already be invalid.
   */
  static logout = async (refreshToken?: string): Promise<void> => {
    if (!AUTH_LOGOUT) return;

    await handleRequest(AUTH_LOGOUT, {
      method: 'POST',
      ...(refreshToken && { body: JSON.stringify({ refresh_token: refreshToken }) }),
      requiresAuth: true,
      endSessionOn401: false,
      // Logging out must not wait on a slow API for long.
      timeoutMs: 5_000,
    });
  };
}
