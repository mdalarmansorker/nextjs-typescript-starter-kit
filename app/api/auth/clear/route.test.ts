import { NextRequest } from 'next/server';

import { describe, expect, it } from 'vitest';

import { COOKIE_NAMES } from '@/constants/cookie';

import { GET, POST } from './route';

const request = (path: string, init: { method?: string; site?: string } = {}) =>
  new NextRequest(new URL(path, 'https://app.example.com'), {
    method: init.method ?? 'GET',
    headers: init.site ? { 'sec-fetch-site': init.site } : {},
  });

const deletedCookies = (res: Response & { cookies: { getAll(): { name: string; value: string }[] } }) =>
  res.cookies
    .getAll()
    .filter(cookie => cookie.value === '')
    .map(cookie => cookie.name);

describe('/api/auth/clear', () => {
  it('redirects home without a redirect parameter', () => {
    const res = GET(request('/api/auth/clear'));

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('https://app.example.com/');
  });

  it('sends the user to login and keeps the redirect parameter', () => {
    const res = GET(request('/api/auth/clear?redirect=abc_123-x'));
    const location = new URL(res.headers.get('location')!);

    expect(location.pathname).toBe('/login');
    expect(location.searchParams.get('redirect')).toBe('abc_123-x');
  });

  it('never redirects to another origin', () => {
    const res = GET(request('/api/auth/clear?redirect=https://evil.example'));

    expect(new URL(res.headers.get('location')!).origin).toBe('https://app.example.com');
  });

  it.each([undefined, 'same-origin', 'none'])('deletes every auth cookie (Sec-Fetch-Site: %s)', site => {
    const res = GET(request('/api/auth/clear', { site }));

    expect(deletedCookies(res)).toEqual(Object.values(COOKIE_NAMES));
  });

  it.each(['cross-site', 'same-site'])('ignores a request started by another site (%s)', site => {
    const res = GET(request('/api/auth/clear', { site }));

    expect(res.status).toBe(307);
    expect(deletedCookies(res)).toEqual([]);
  });

  it('logs out from a form POST with a 303', () => {
    const res = POST(request('/api/auth/clear', { method: 'POST', site: 'same-origin' }));

    expect(res.status).toBe(303);
    expect(deletedCookies(res)).toEqual(Object.values(COOKIE_NAMES));
  });

  it('ignores a form POST from another site', () => {
    const res = POST(request('/api/auth/clear', { method: 'POST', site: 'cross-site' }));

    expect(deletedCookies(res)).toEqual([]);
  });
});
