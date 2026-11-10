// @vitest-environment jsdom
import Cookies from 'js-cookie';
import { afterEach, describe, expect, it } from 'vitest';

import CookieService from './cookie.service';

// Runs in jsdom (see the comment above), so this covers the browser side (js-cookie). The server side is in cookie.service.server.test.ts.
afterEach(() => {
  CookieService.clearSync(Object.keys(Cookies.get()));
});

describe('CookieService in the browser', () => {
  it('stores, reads, updates and deletes a cookie', async () => {
    await CookieService.store('theme', 'dark');
    expect(await CookieService.get('theme')).toBe('dark');

    await CookieService.update('theme', 'light');
    expect(await CookieService.get('theme')).toBe('light');

    await CookieService.delete('theme');
    expect(await CookieService.get('theme')).toBeUndefined();
  });

  it('clears the auth cookies but keeps everything else', async () => {
    Cookies.set('__rt', 'refresh');
    Cookies.set('__prm', 'permissions');
    Cookies.set('__ts', 'dark');

    await CookieService.clear();

    expect(Cookies.get()).toEqual({ __ts: 'dark' });
  });

  it('offers synchronous helpers', () => {
    CookieService.storeSync('lang', 'en');
    expect(CookieService.getSync('lang')).toBe('en');

    CookieService.deleteSync('lang');
    expect(CookieService.getSync('lang')).toBeUndefined();
  });
});
