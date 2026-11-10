import 'server-only';

import { z } from 'zod';

import { AUTH_LOGIN } from '@/constants/api';

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
}
