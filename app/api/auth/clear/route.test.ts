import { NextRequest } from 'next/server';

import { describe, expect, it } from 'vitest';

import { COOKIE_NAMES } from '@/constants/cookie';

import { GET } from './route';

const call = (path: string) => GET(new NextRequest(new URL(path, 'https://app.example.com')));

describe('GET /api/auth/clear', () => {
  it('redirects home without a redirect parameter', () => {
    const res = call('/api/auth/clear');

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('https://app.example.com/');
  });

  it('sends the user to login and keeps the redirect parameter', () => {
    const res = call('/api/auth/clear?redirect=abc_123-x');
    const location = new URL(res.headers.get('location')!);

    expect(location.pathname).toBe('/login');
    expect(location.searchParams.get('redirect')).toBe('abc_123-x');
  });

  it('never redirects to another origin', () => {
    const res = call('/api/auth/clear?redirect=https://evil.example');

    expect(new URL(res.headers.get('location')!).origin).toBe('https://app.example.com');
  });

  it('deletes every auth cookie', () => {
    const res = call('/api/auth/clear');

    for (const name of Object.values(COOKIE_NAMES)) {
      const cookie = res.cookies.get(name);

      expect(cookie?.value).toBe('');
      expect(cookie?.expires).toEqual(new Date(0));
    }
  });
});
