import { describe, expect, it, vi } from 'vitest';

import AuthService from './auth.service';
import { handleRequest } from './base.service';

vi.mock('./base.service', () => ({ handleRequest: vi.fn() }));

describe('AuthService.login', () => {
  it('posts the credentials to the login endpoint', async () => {
    await AuthService.login({ email: 'ada@example.com', password: 'secret' });

    expect(handleRequest).toHaveBeenCalledWith('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'ada@example.com', password: 'secret' }),
      parse: expect.any(Function),
    });
  });

  it('accepts a response with a token and rejects one without', async () => {
    await AuthService.login({ email: 'a@b.c', password: 'x' });

    const { parse } = vi.mocked(handleRequest).mock.calls[0]![1]!;

    expect(parse!({ token: 'abc', user: {} })).toEqual({ token: 'abc' });
    expect(() => parse!({ access_token: 'abc' })).toThrow();
    expect(() => parse!({ token: '' })).toThrow();
  });
});

describe('AuthService.logout', () => {
  it('revokes the token without ending the session on a 401', async () => {
    await AuthService.logout();

    expect(handleRequest).toHaveBeenCalledWith('/auth/logout', {
      method: 'POST',
      requiresAuth: true,
      endSessionOn401: false,
      timeoutMs: 5_000,
    });
  });
});
