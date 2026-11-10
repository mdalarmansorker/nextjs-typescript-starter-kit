import { updateTag } from 'next/cache';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import apiInterceptor from './api.interceptor';
import { ApiError } from './api-errors';
import { executeServerRequest } from './server-request';

vi.mock('next/cache', () => ({ updateTag: vi.fn() }));
vi.mock('./api.interceptor', () => ({ default: vi.fn() }));
const api = vi.hoisted(() => ({ API_URL: 'https://api.test' }));

vi.mock('@/constants/api', () => api);

const respond = (body: unknown, status = 200) => {
  vi.mocked(apiInterceptor).mockResolvedValue(
    new Response(body === null || typeof body === 'string' ? body : JSON.stringify(body), { status }),
  );
};

beforeEach(() => {
  api.API_URL = 'https://api.test';
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('API URL building', () => {
  it.each([
    ['https://api.test', '/items?page=2', 'https://api.test/items?page=2'],
    ['https://api.test/api', '/items', 'https://api.test/api/items'],
    ['https://api.test/api/', '/items', 'https://api.test/api/items'],
  ])('joins %s and %s', async (base, slug, expected) => {
    api.API_URL = base;
    respond({});

    await executeServerRequest(slug);

    expect(apiInterceptor).toHaveBeenCalledWith(expected, {});
  });

  it.each([
    ['https://api.test', '@evil.example/steal'],
    ['https://api.test', '//evil.example/steal'],
    ['https://api.test', 'items'],
    ['https://api.test/api', '/../admin'],
    ['https://api.test/api', '/%2e%2e/admin'],
    ['https://api.test/api', '/..'],
  ])('refuses to leave %s with the slug %s', async (base, slug) => {
    api.API_URL = base;

    const result = await executeServerRequest(slug);

    expect(result).toMatchObject({ ok: false, status: 400 });
    expect(apiInterceptor).not.toHaveBeenCalled();
  });

  it('reports a missing API_URL', async () => {
    api.API_URL = '';

    expect(await executeServerRequest('/items')).toMatchObject({
      ok: false,
      data: { message: expect.stringContaining('API_URL is not set') },
    });
  });
});

describe('executeServerRequest', () => {
  it('prefixes the slug with API_URL and passes the options through', async () => {
    respond({});

    await executeServerRequest('/items', { method: 'POST', requiresAuth: true, revalidateTags: ['items'] });

    expect(apiInterceptor).toHaveBeenCalledWith('https://api.test/items', { method: 'POST', requiresAuth: true });
  });

  it('adds query parameters, encoded, and leaves out empty ones', async () => {
    respond({});

    await executeServerRequest('/items', {
      query: { search: 'a&b c', page: 2, active: true, ids: [1, 2], 'tags[]': ['x'], empty: null, gone: undefined },
    });

    const url = new URL(vi.mocked(apiInterceptor).mock.calls[0]![0]);

    expect(url.pathname).toBe('/items');
    expect([...url.searchParams]).toEqual([
      ['search', 'a&b c'],
      ['page', '2'],
      ['active', 'true'],
      ['ids', '1'],
      ['ids', '2'],
      ['tags[]', 'x'],
    ]);
  });

  it('returns the parsed body of a successful response', async () => {
    respond({ id: 1 }, 201);

    expect(await executeServerRequest('/items')).toEqual({ ok: true, status: 201, data: { id: 1 } });
  });

  it('returns null data for a body that is not JSON', async () => {
    respond(null, 204);

    expect(await executeServerRequest('/items/1')).toEqual({ ok: true, status: 204, data: null });
  });

  it('returns the API error body of a failed response', async () => {
    const error = { status: 'error', message: 'The given data was invalid.', errors: { name: ['Required'] } };
    respond(error, 422);

    expect(await executeServerRequest('/items')).toEqual({ ok: false, status: 422, data: error });
  });

  it('revalidates tags after a successful request only', async () => {
    respond({}, 422);
    await executeServerRequest('/items', { revalidateTags: ['items'] });
    expect(updateTag).not.toHaveBeenCalled();

    respond({});
    await executeServerRequest('/items', { revalidateTags: ['items', 'dashboard'] });
    expect(updateTag).toHaveBeenCalledWith('items');
    expect(updateTag).toHaveBeenCalledWith('dashboard');
  });

  it('still returns the data when revalidation fails', async () => {
    respond({ id: 1 });
    vi.mocked(updateTag).mockImplementation(() => {
      throw new Error('not in a server action');
    });

    expect(await executeServerRequest('/items', { revalidateTags: ['items'] })).toMatchObject({ ok: true });
  });

  it('turns a thrown ApiError into an error result with its status', async () => {
    vi.mocked(apiInterceptor).mockRejectedValue(new ApiError('Authentication failed.', 401, { token: 'expired' }));

    expect(await executeServerRequest('/me')).toEqual({
      ok: false,
      status: 401,
      data: { message: 'Authentication failed.', errors: { token: 'expired' } },
    });
  });

  it('reports a network failure as a 500', async () => {
    vi.mocked(apiInterceptor).mockRejectedValue(new TypeError('fetch failed'));

    expect(await executeServerRequest('/items')).toEqual({
      ok: false,
      status: 500,
      data: { message: 'fetch failed', errors: null },
    });
  });

  it('reports a timeout as a 504', async () => {
    vi.mocked(apiInterceptor).mockRejectedValue(new DOMException('The operation timed out.', 'TimeoutError'));

    expect(await executeServerRequest('/slow')).toEqual({
      ok: false,
      status: 504,
      data: { message: 'The API did not respond in time.', errors: null },
    });
  });

  it('rethrows Next.js control-flow errors such as redirects', async () => {
    const redirectError = Object.assign(new Error('NEXT_REDIRECT'), {
      digest: 'NEXT_REDIRECT;replace;/login;307;',
    });
    vi.mocked(apiInterceptor).mockRejectedValue(redirectError);

    await expect(executeServerRequest('/items')).rejects.toBe(redirectError);
  });
});
