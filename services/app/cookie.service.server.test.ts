import { cookies } from 'next/headers';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import CookieService from './cookie.service';

vi.mock('next/headers', () => ({ cookies: vi.fn() }));

// Runs in node, so this covers the server side (next/headers). The browser side is in cookie.service.client.test.ts.
const store = {
  get: vi.fn(),
  getAll: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};

beforeEach(() => {
  vi.mocked(cookies).mockResolvedValue(store as never);
});

describe('CookieService on the server', () => {
  it('reads a cookie from the request', async () => {
    store.get.mockReturnValue({ name: '__at', value: 'token' });

    expect(await CookieService.get('__at')).toBe('token');
  });

  it('converts js-cookie options to Next.js options', async () => {
    await CookieService.store('__at', 'token', {
      expires: 15,
      path: '/',
      secure: true,
      httpOnly: true,
      sameSite: 'Lax',
    } as never);

    expect(store.set).toHaveBeenCalledWith('__at', 'token', {
      maxAge: 15 * 86400,
      path: '/',
      secure: true,
      httpOnly: true,
      sameSite: 'lax',
    });
  });

  it('passes an expiry date through', async () => {
    const expires = new Date('2030-01-01T00:00:00Z');

    await CookieService.store('__rt', 'token', { expires });

    expect(store.set).toHaveBeenCalledWith('__rt', 'token', { expires });
  });

  it('deletes a cookie with its path and domain', async () => {
    await CookieService.delete('__at', { path: '/', domain: 'example.com' });

    expect(store.delete).toHaveBeenCalledWith({ name: '__at', path: '/', domain: 'example.com' });
  });

  it('clears every cookie of the request', async () => {
    store.getAll.mockReturnValue([{ name: '__at' }, { name: '__rt' }]);

    await CookieService.clear();

    expect(store.delete).toHaveBeenCalledWith('__at');
    expect(store.delete).toHaveBeenCalledWith('__rt');
  });

  it.each(['storeSync', 'getSync', 'deleteSync', 'clearSync'] as const)('refuses %s on the server', method => {
    expect(() => (CookieService[method] as (...args: string[]) => unknown)('name', 'value')).toThrow(
      'cannot be used on server-side',
    );
  });
});
