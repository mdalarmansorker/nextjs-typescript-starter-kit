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

const sentHeaders = (): Headers => fetchMock.mock.calls[0][1]!.headers as Headers;

describe('apiInterceptor', () => {
  it('sends JSON headers', async () => {
    await apiInterceptor('https://api.test/items');

    expect(sentHeaders().get('Accept')).toBe('application/json');
    expect(sentHeaders().get('Content-Type')).toBe('application/json');
    expect(sentHeaders().has('Authorization')).toBe(false);
  });

  it('leaves Content-Type to the browser for FormData', async () => {
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

    expect((fetchMock.mock.calls[0][1]!.headers as Headers).get('X-Forwarded-For')).toBe('203.0.113.7');
    expect((fetchMock.mock.calls[1][1]!.headers as Headers).has('X-Forwarded-For')).toBe(false);
  });

  it('marks the request as dynamic unless it is a cached read', async () => {
    await apiInterceptor('https://api.test/items');
    expect(connection).toHaveBeenCalledTimes(1);

    await apiInterceptor('https://api.test/items', { cachedRead: true });
    expect(connection).toHaveBeenCalledTimes(1);
  });

  it('does not pass its own options on to fetch', async () => {
    await apiInterceptor('https://api.test/items', { cachedRead: true, cache: 'no-store' });

    const init = fetchMock.mock.calls[0][1]!;

    expect(init).not.toHaveProperty('cachedRead');
    expect(init).not.toHaveProperty('requiresAuth');
    expect(init.cache).toBe('no-store');
  });
});
