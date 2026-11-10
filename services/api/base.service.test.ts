import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { decodeRedirectPath } from '@/utils/redirect-path';

import CookieService from '@/services/app/cookie.service';
import { canSaveSession, getRefreshToken, refreshSession } from '@/services/app/session.service';

import { ApiError } from './api-errors';
import { handleRequest } from './base.service';
import { executeServerRequest } from './server-request';

vi.mock('next/headers', () => ({ headers: vi.fn() }));
vi.mock('next/navigation', () => ({
  redirect: vi.fn(() => {
    throw new Error('NEXT_REDIRECT');
  }),
}));
vi.mock('./server-request', () => ({ executeServerRequest: vi.fn() }));
vi.mock('@/services/app/cookie.service', () => ({ default: { clear: vi.fn() } }));
vi.mock('@/services/app/session.service', () => ({
  canSaveSession: vi.fn(),
  getRefreshToken: vi.fn(),
  refreshSession: vi.fn(),
}));

const apiError = { status: 'error' as const, message: 'Validation failed', errors: { email: ['Taken'] } };

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(redirect).mockImplementation(() => {
    throw new Error('NEXT_REDIRECT');
  });
  vi.mocked(headers).mockResolvedValue(new Headers() as never);
  // By default a Server Component render, where cookies are read-only.
  vi.mocked(CookieService.clear).mockRejectedValue(new Error('Cookies can only be modified in a Server Action'));
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('handleRequest', () => {
  it('returns the data of a successful response', async () => {
    vi.mocked(executeServerRequest).mockResolvedValue({ ok: true, status: 200, data: { id: 1 } });

    expect(await handleRequest('/items/1')).toEqual({ id: 1 });
  });

  it('throws an ApiError with the status, message and field errors', async () => {
    vi.mocked(executeServerRequest).mockResolvedValue({ ok: false, status: 422, data: apiError });

    const error = await handleRequest('/items').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 422, message: 'Validation failed', errors: { email: ['Taken'] } });
  });

  it('throws a generic message when the API sent none', async () => {
    vi.mocked(executeServerRequest).mockResolvedValue({ ok: false, status: 502, data: null as never });

    await expect(handleRequest('/items')).rejects.toMatchObject({ status: 502, message: 'Something went wrong' });
  });

  it('reads error bodies of other shapes', async () => {
    vi.mocked(executeServerRequest).mockResolvedValue({
      ok: false,
      status: 422,
      data: { detail: [{ loc: ['body', 'email'], msg: 'field required' }] },
    });

    await expect(handleRequest('/items')).rejects.toMatchObject({
      status: 422,
      message: 'Something went wrong',
      fieldErrors: { email: ['field required'] },
    });

    vi.mocked(executeServerRequest).mockResolvedValue({ ok: false, status: 403, data: { error: 'Not allowed' } });

    await expect(handleRequest('/items')).rejects.toMatchObject({ status: 403, message: 'Not allowed' });
  });

  describe('parse', () => {
    const Item = z.object({ id: z.number() });

    it('returns the parsed data', async () => {
      vi.mocked(executeServerRequest).mockResolvedValue({ ok: true, status: 200, data: { id: 1, extra: true } });

      expect(await handleRequest('/items/1', { parse: data => Item.parse(data) })).toEqual({ id: 1 });
    });

    it('throws a 502 when the response has the wrong shape', async () => {
      vi.mocked(executeServerRequest).mockResolvedValue({ ok: true, status: 200, data: { id: 'one' } });

      await expect(handleRequest('/items/1', { parse: data => Item.parse(data) })).rejects.toMatchObject({
        status: 502,
        message: 'The API returned an unexpected response.',
      });
    });

    it('is not sent to the API', async () => {
      vi.mocked(executeServerRequest).mockResolvedValue({ ok: true, status: 200, data: { id: 1 } });

      await handleRequest('/items/1', { requiresAuth: true, parse: data => Item.parse(data) });

      expect(executeServerRequest).toHaveBeenCalledWith('/items/1', { requiresAuth: true });
    });
  });

  describe('expired sessions', () => {
    beforeEach(() => {
      vi.mocked(executeServerRequest).mockResolvedValue({ ok: false, status: 401, data: apiError });
    });

    it('ends the session and returns the user to the current page after login', async () => {
      vi.mocked(headers).mockResolvedValue(new Headers({ 'x-current-path': '/projects?page=2' }) as never);

      await expect(handleRequest('/me', { requiresAuth: true })).rejects.toThrow('NEXT_REDIRECT');

      const target = new URL(vi.mocked(redirect).mock.calls[0]![0], 'https://app.test');

      expect(target.pathname).toBe('/api/auth/clear');
      expect(decodeRedirectPath(target.searchParams.get('redirect'))).toBe('/projects?page=2');
    });

    it('ends the session without a return page outside a page request', async () => {
      vi.mocked(headers).mockRejectedValue(new Error('outside a request'));

      await expect(handleRequest('/me', { requiresAuth: true })).rejects.toThrow('NEXT_REDIRECT');
      expect(redirect).toHaveBeenCalledWith('/api/auth/clear');
    });

    it('in a server action, deletes the cookies itself and goes to login with the current page', async () => {
      vi.mocked(CookieService.clear).mockResolvedValue();
      vi.mocked(headers).mockResolvedValue(new Headers({ 'x-current-path': '/projects' }) as never);

      await expect(handleRequest('/me', { requiresAuth: true })).rejects.toThrow('NEXT_REDIRECT');

      const target = new URL(vi.mocked(redirect).mock.calls[0]![0], 'https://app.test');

      expect(CookieService.clear).toHaveBeenCalledOnce();
      expect(target.pathname).toBe('/login');
      expect(decodeRedirectPath(target.searchParams.get('redirect'))).toBe('/projects');
    });

    it('does not end the session on a 401 from a public request', async () => {
      await expect(handleRequest('/login', { method: 'POST' })).rejects.toBeInstanceOf(ApiError);
      expect(redirect).not.toHaveBeenCalled();
    });

    it('throws instead of ending the session when endSessionOn401 is false', async () => {
      await expect(handleRequest('/logout', { requiresAuth: true, endSessionOn401: false })).rejects.toMatchObject({
        status: 401,
      });
      expect(redirect).not.toHaveBeenCalled();
    });
  });

  describe('token refresh', () => {
    const unauthorized = { ok: false as const, status: 401, data: apiError };

    beforeEach(() => {
      vi.mocked(getRefreshToken).mockResolvedValue('ref');
    });

    it('refreshes and retries once in a server action', async () => {
      vi.mocked(canSaveSession).mockResolvedValue(true);
      vi.mocked(refreshSession).mockResolvedValue(true);
      vi.mocked(executeServerRequest)
        .mockResolvedValueOnce(unauthorized)
        .mockResolvedValueOnce({ ok: true, status: 200, data: { id: 1 } });

      expect(await handleRequest('/me', { requiresAuth: true })).toEqual({ id: 1 });
      expect(executeServerRequest).toHaveBeenCalledTimes(2);
      expect(redirect).not.toHaveBeenCalled();
    });

    it('ends the session when the API rejects the refresh token', async () => {
      vi.mocked(canSaveSession).mockResolvedValue(true);
      vi.mocked(refreshSession).mockResolvedValue(false);
      vi.mocked(CookieService.clear).mockResolvedValue();
      vi.mocked(executeServerRequest).mockResolvedValue(unauthorized);

      await expect(handleRequest('/me', { requiresAuth: true })).rejects.toThrow('NEXT_REDIRECT');
      expect(CookieService.clear).toHaveBeenCalledOnce();
      expect(redirect).toHaveBeenCalledWith('/login');
      expect(executeServerRequest).toHaveBeenCalledOnce();
    });

    it('ends the session when the new token is refused too, without looping', async () => {
      vi.mocked(canSaveSession).mockResolvedValue(true);
      vi.mocked(refreshSession).mockResolvedValue(true);
      vi.mocked(CookieService.clear).mockResolvedValue();
      vi.mocked(executeServerRequest).mockResolvedValue(unauthorized);

      await expect(handleRequest('/me', { requiresAuth: true })).rejects.toThrow('NEXT_REDIRECT');
      expect(refreshSession).toHaveBeenCalledOnce();
      expect(redirect).toHaveBeenCalledWith('/login');
    });

    it('sends a Server Component render through the refresh route, back to the current page', async () => {
      vi.mocked(canSaveSession).mockResolvedValue(false);
      vi.mocked(headers).mockResolvedValue(new Headers({ 'x-current-path': '/projects' }) as never);
      vi.mocked(executeServerRequest).mockResolvedValue(unauthorized);

      await expect(handleRequest('/me', { requiresAuth: true })).rejects.toThrow('NEXT_REDIRECT');

      const target = new URL(vi.mocked(redirect).mock.calls[0]![0], 'https://app.test');

      expect(target.pathname).toBe('/api/auth/refresh');
      expect(decodeRedirectPath(target.searchParams.get('redirect'))).toBe('/projects');
      expect(refreshSession).not.toHaveBeenCalled();
    });
  });
});
