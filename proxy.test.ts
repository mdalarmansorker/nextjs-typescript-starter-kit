import { NextRequest } from 'next/server';

import { describe, expect, it } from 'vitest';

import { decodeRedirectPath, encodeRedirectPath } from '@/utils/redirect-path';

import { proxy } from './proxy';

const request = (path: string, { loggedIn = false, headers = {} as Record<string, string> } = {}) =>
  new NextRequest(new URL(path, 'https://app.example.com'), {
    headers: { ...headers, ...(loggedIn ? { cookie: '__at=token' } : {}) },
  });

const location = (res: Response) => new URL(res.headers.get('location')!);

/** The request headers the proxy passes on to the page (NextResponse.next encodes them in a header). */
const forwardedHeader = (res: Response, name: string) => res.headers.get(`x-middleware-request-${name}`);

describe('proxy', () => {
  it('sends a logged-out user from a protected page to login, remembering the page', () => {
    const res = proxy(request('/dashboard/settings?tab=2'));

    expect(location(res).pathname).toBe('/login');
    expect(decodeRedirectPath(location(res).searchParams.get('redirect'))).toBe('/dashboard/settings?tab=2');
  });

  it('lets a logged-in user open a protected page', () => {
    const res = proxy(request('/dashboard', { loggedIn: true }));

    expect(res.headers.get('location')).toBeNull();
  });

  it('does not protect pages that only start with the same letters', () => {
    expect(proxy(request('/dashboards-public')).headers.get('location')).toBeNull();
  });

  it('lets a logged-out user open public pages', () => {
    expect(proxy(request('/')).headers.get('location')).toBeNull();
    expect(proxy(request('/login')).headers.get('location')).toBeNull();
  });

  it('sends a logged-in user from login to the dashboard', () => {
    expect(location(proxy(request('/login', { loggedIn: true }))).pathname).toBe('/dashboard');
  });

  it('sends a logged-in user from login to the page in ?redirect=', () => {
    const res = proxy(request(`/login?redirect=${encodeRedirectPath('/reports?y=2026')}`, { loggedIn: true }));

    expect(location(res).pathname + location(res).search).toBe('/reports?y=2026');
  });

  it.each([
    ['another site', Buffer.from('https://evil.example').toString('base64url')],
    ['the login page (loop)', encodeRedirectPath('/login')!],
  ])('ignores a ?redirect= to %s', (_label, value) => {
    const res = proxy(request(`/login?redirect=${value}`, { loggedIn: true }));

    expect(location(res).href).toBe('https://app.example.com/dashboard');
  });

  it('passes the current path to server code and overwrites a value sent by the browser', () => {
    const res = proxy(request('/projects?page=2', { headers: { 'x-current-path': '/forged' } }));

    expect(forwardedHeader(res, 'x-current-path')).toBe('/projects?page=2');
  });

  describe('token refresh', () => {
    const withRefreshToken = (path: string, method = 'GET') =>
      new NextRequest(new URL(path, 'https://app.example.com'), { method, headers: { cookie: '__rt=refresh' } });

    it('refreshes an expired access token before the page renders, then comes back', () => {
      const res = proxy(withRefreshToken('/dashboard?tab=2'));

      expect(location(res).pathname).toBe('/api/auth/refresh');
      expect(decodeRedirectPath(location(res).searchParams.get('redirect'))).toBe('/dashboard?tab=2');
    });

    it('leaves server actions to refresh in handleRequest', () => {
      expect(proxy(withRefreshToken('/dashboard', 'POST')).headers.get('location')).toBeNull();
    });

    it('does not refresh while the access token is still there', () => {
      const res = proxy(
        new NextRequest(new URL('/dashboard', 'https://app.example.com'), {
          headers: { cookie: '__at=token; __rt=refresh' },
        }),
      );

      expect(res.headers.get('location')).toBeNull();
    });
  });
});
