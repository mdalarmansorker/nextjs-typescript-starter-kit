// @vitest-environment jsdom
import Cookies from 'js-cookie';
import { afterEach, describe, expect, it } from 'vitest';

import CookieService from './cookie.service';

// Runs in jsdom (see the comment above), so this covers the browser side (js-cookie). The server side is in cookie.service.server.test.ts.
afterEach(() => {
  CookieService.clearSync();
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

  it('clears every cookie', async () => {
    Cookies.set('a', '1');
    Cookies.set('b', '2');

    await CookieService.clear();

    expect(Cookies.get()).toEqual({});
  });

  it('offers synchronous helpers', () => {
    CookieService.storeSync('lang', 'en');
    expect(CookieService.getSync('lang')).toBe('en');

    CookieService.deleteSync('lang');
    expect(CookieService.getSync('lang')).toBeUndefined();
  });
});
