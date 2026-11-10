import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { decodeRedirectPath } from '@/utils/redirect-path';

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

const apiError = { status: 'error' as const, message: 'Validation failed', errors: { email: ['Taken'] } };

beforeEach(() => {
  vi.mocked(headers).mockResolvedValue(new Headers() as never);
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

    it('does not end the session on a 401 from a public request', async () => {
      await expect(handleRequest('/login', { method: 'POST' })).rejects.toBeInstanceOf(ApiError);
      expect(redirect).not.toHaveBeenCalled();
    });
  });
});
