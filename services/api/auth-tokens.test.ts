import { beforeEach, describe, expect, it, vi } from 'vitest';

import { refreshTokens, TokenResponseSchema } from './auth-tokens';
import { executeServerRequest } from './server-request';

vi.mock('./server-request', () => ({ executeServerRequest: vi.fn() }));

describe('TokenResponseSchema', () => {
  it.each([
    ['Laravel Sanctum', { token: 'a' }, { accessToken: 'a' }],
    [
      'OAuth 2',
      { access_token: 'a', refresh_token: 'r', expires_in: 3600, token_type: 'Bearer' },
      { accessToken: 'a', refreshToken: 'r', expiresIn: 3600 },
    ],
    [
      'camelCase',
      { accessToken: 'a', refreshToken: 'r', expiresIn: 900 },
      { accessToken: 'a', refreshToken: 'r', expiresIn: 900 },
    ],
    ['Django SimpleJWT', { access: 'a', refresh: 'r' }, { accessToken: 'a', refreshToken: 'r' }],
  ])('reads the %s shape', (_name, body, expected) => {
    expect(TokenResponseSchema.parse(body)).toEqual({ refreshToken: undefined, expiresIn: undefined, ...expected });
  });

  it.each([{}, { token: '' }, { refresh_token: 'r' }, { token: 'a', expires_in: -1 }])('rejects %j', body => {
    expect(() => TokenResponseSchema.parse(body)).toThrow();
  });
});

describe('refreshTokens', () => {
  let counter = 0;
  /** A refresh token no earlier test has used, since results are reused for a few seconds. */
  const fresh = () => `refresh-${++counter}`;

  beforeEach(() => {
    vi.mocked(executeServerRequest).mockResolvedValue({
      ok: true,
      status: 200,
      data: { access_token: 'new-access', refresh_token: 'new-refresh', expires_in: 3600 },
    });
  });

  it('posts the refresh token and returns the new tokens', async () => {
    const token = fresh();

    expect(await refreshTokens(token)).toEqual({
      accessToken: 'new-access',
      refreshToken: 'new-refresh',
      expiresIn: 3600,
    });
    expect(executeServerRequest).toHaveBeenCalledWith('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: token }),
      timeoutMs: 5_000,
    });
  });

  it('sends one request for parallel refreshes with the same token', async () => {
    const token = fresh();
    const [first, second] = await Promise.all([refreshTokens(token), refreshTokens(token)]);

    expect(first).toBe(second);
    expect(executeServerRequest).toHaveBeenCalledOnce();
  });

  it('reuses a recent result for a request that still carries the old token', async () => {
    const token = fresh();

    await refreshTokens(token);
    await refreshTokens(token);

    expect(executeServerRequest).toHaveBeenCalledOnce();
  });

  it('refreshes again once the reuse window has passed', async () => {
    vi.useFakeTimers();
    const token = fresh();

    await refreshTokens(token);
    vi.advanceTimersByTime(11_000);
    await refreshTokens(token);

    expect(executeServerRequest).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it('throws the API error when the refresh token is rejected', async () => {
    vi.mocked(executeServerRequest).mockResolvedValue({
      ok: false,
      status: 401,
      data: { message: 'Refresh token expired' },
    });

    await expect(refreshTokens(fresh())).rejects.toMatchObject({ status: 401, message: 'Refresh token expired' });
  });

  it('does not reuse a failure', async () => {
    const token = fresh();

    vi.mocked(executeServerRequest).mockResolvedValueOnce({ ok: false, status: 504, data: null });
    await expect(refreshTokens(token)).rejects.toMatchObject({ status: 504 });

    expect(await refreshTokens(token)).toMatchObject({ accessToken: 'new-access' });
  });

  it('throws a 502 for a response without an access token', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(executeServerRequest).mockResolvedValue({ ok: true, status: 200, data: { ok: true } });

    await expect(refreshTokens(fresh())).rejects.toMatchObject({ status: 502 });
  });
});
