import { redirect } from 'next/navigation';

import { describe, expect, it, vi } from 'vitest';

import { handleRequest } from './base.service';
import { executeServerRequest } from './server-request';

vi.mock('next/navigation', () => ({ redirect: vi.fn() }));
vi.mock('./server-request', () => ({ executeServerRequest: vi.fn() }));

const apiError = { status: 'error' as const, message: 'Validation failed', errors: { email: ['Taken'] } };

describe('handleRequest', () => {
  it('returns the data of a successful response', async () => {
    vi.mocked(executeServerRequest).mockResolvedValue({ ok: true, status: 200, data: { id: 1 } });

    expect(await handleRequest('/items/1')).toEqual({ id: 1 });
  });

  it('throws an Error with the API message', async () => {
    vi.mocked(executeServerRequest).mockResolvedValue({ ok: false, status: 422, data: apiError });

    await expect(handleRequest('/items')).rejects.toThrow('Validation failed');
  });

  it('throws a generic message when the API sent none', async () => {
    vi.mocked(executeServerRequest).mockResolvedValue({ ok: false, status: 502, data: null as never });

    await expect(handleRequest('/items')).rejects.toThrow('Something went wrong');
  });

  it('throws the raw API error in raw mode', async () => {
    vi.mocked(executeServerRequest).mockResolvedValue({ ok: false, status: 422, data: apiError });

    await expect(handleRequest('/register', { method: 'POST' }, 'raw')).rejects.toBe(apiError);
  });

  it('logs the user out on a 401 from an authenticated request', async () => {
    vi.mocked(executeServerRequest).mockResolvedValue({ ok: false, status: 401, data: apiError });

    await expect(handleRequest('/me', { requiresAuth: true })).rejects.toThrow();
    expect(redirect).toHaveBeenCalledWith('/api/auth/clear');
  });

  it('does not log out on a 401 from a public request', async () => {
    vi.mocked(executeServerRequest).mockResolvedValue({ ok: false, status: 401, data: apiError });

    await expect(handleRequest('/login', { method: 'POST' })).rejects.toThrow();
    expect(redirect).not.toHaveBeenCalled();
  });
});
