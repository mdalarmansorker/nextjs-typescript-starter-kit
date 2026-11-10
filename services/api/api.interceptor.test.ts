import { connection } from 'next/server';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getClientIp } from '@/utils/client-ip.server';

import CookieService from '../app/cookie.service';

import apiInterceptor from './api.interceptor';
import { ApiError } from './api-errors';

vi.mock('next/server', () => ({ connection: vi.fn() }));
vi.mock('@/utils/client-ip.server', () => ({ getClientIp: vi.fn() }));
vi.mock('../app/cookie.service', () => ({ default: { get: vi.fn() } }));

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockResolvedValue(new Response('{}', { status: 200 }));
  vi.mocked(getClientIp).mockResolvedValue(null);
  vi.mocked(CookieService.get).mockResolvedValue(undefined);
});

/** The `init` argument of the nth fetch call. */
const sentInit = (call = 0): RequestInit => {
  const init = fetchMock.mock.calls[call]?.[1];

  if (!init) throw new Error(`fetch call ${call} was not made`);

  return init;
};

const sentHeaders = (call = 0): Headers => sentInit(call).headers as Headers;

describe('apiInterceptor', () => {
  it('asks for JSON', async () => {
    await apiInterceptor('https://api.test/items');

    expect(sentHeaders().get('Accept')).toBe('application/json');
    expect(sentHeaders().has('Authorization')).toBe(false);
  });

  it('keeps an Accept header set by the caller, e.g. for a download', async () => {
    await apiInterceptor('https://api.test/report', { headers: { Accept: 'application/pdf' } });

    expect(sentHeaders().get('Accept')).toBe('application/pdf');
  });

  it('declares a JSON body, but not a missing one', async () => {
    await apiInterceptor('https://api.test/items', { method: 'POST', body: '{}' });
    await apiInterceptor('https://api.test/items');

    expect(sentHeaders(0).get('Content-Type')).toBe('application/json');
    expect(sentHeaders(1).has('Content-Type')).toBe(false);
  });

  it('leaves Content-Type to fetch for FormData', async () => {
    await apiInterceptor('https://api.test/upload', { method: 'POST', body: new FormData() });

    expect(sentHeaders().has('Content-Type')).toBe(false);
  });

  it('attaches the access token when auth is required', async () => {
    vi.mocked(CookieService.get).mockResolvedValue('token-123');

    await apiInterceptor('https://api.test/me', { requiresAuth: true });

    expect(sentHeaders().get('Authorization')).toBe('Bearer token-123');
  });

  it('throws a 401 without calling the API when the token is missing', async () => {
    await expect(apiInterceptor('https://api.test/me', { requiresAuth: true })).rejects.toMatchObject({
      name: 'ApiError',
      status: 401,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('turns an authenticated 401 response into an ApiError', async () => {
    vi.mocked(CookieService.get).mockResolvedValue('expired');
    fetchMock.mockResolvedValue(new Response(null, { status: 401 }));

    await expect(apiInterceptor('https://api.test/me', { requiresAuth: true })).rejects.toBeInstanceOf(ApiError);
  });

  it('passes a public 401 response through', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 401 }));

    expect((await apiInterceptor('https://api.test/login', { method: 'POST' })).status).toBe(401);
  });

  it('forwards the client address on writes only', async () => {
    vi.mocked(getClientIp).mockResolvedValue('203.0.113.7');

    await apiInterceptor('https://api.test/login', { method: 'post' });
    await apiInterceptor('https://api.test/items');

    expect(sentHeaders(0).get('X-Forwarded-For')).toBe('203.0.113.7');
    expect(sentHeaders(1).has('X-Forwarded-For')).toBe(false);
  });

  it('marks the request as dynamic unless it is a cached read', async () => {
    await apiInterceptor('https://api.test/items');
    expect(connection).toHaveBeenCalledTimes(1);

    await apiInterceptor('https://api.test/items', { cachedRead: true });
    expect(connection).toHaveBeenCalledTimes(1);
  });

  it('does not pass its own options on to fetch', async () => {
    await apiInterceptor('https://api.test/items', { cachedRead: true, timeoutMs: 500, cache: 'no-store' });

    const init = sentInit();

    expect(init).not.toHaveProperty('cachedRead');
    expect(init).not.toHaveProperty('requiresAuth');
    expect(init).not.toHaveProperty('timeoutMs');
    expect(init.cache).toBe('no-store');
  });

  describe('timeout', () => {
    /** A fetch that never answers, and rejects like the real one when its signal aborts. */
    const hangingFetch: typeof fetch = (_url, init) =>
      new Promise((_resolve, reject) => {
        const signal = init?.signal;

        if (signal?.aborted) reject(signal.reason);
        signal?.addEventListener('abort', () => reject(signal.reason));
      });

    it('cancels a request that takes longer than timeoutMs', async () => {
      fetchMock.mockImplementation(hangingFetch);

      await expect(apiInterceptor('https://api.test/slow', { timeoutMs: 20 })).rejects.toMatchObject({
        name: 'TimeoutError',
      });
    });

    it('still honours the caller’s own signal', async () => {
      fetchMock.mockImplementation(hangingFetch);
      const controller = new AbortController();

      const request = apiInterceptor('https://api.test/slow', { signal: controller.signal });
      controller.abort();

      await expect(request).rejects.toMatchObject({ name: 'AbortError' });
    });
  });
});
