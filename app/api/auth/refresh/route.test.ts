import { redirect } from 'next/navigation';
import { NextRequest } from 'next/server';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { decodeRedirectPath, encodeRedirectPath } from '@/utils/redirect-path';

import { ApiError } from '@/services/api/api-errors';
import { refreshSession } from '@/services/app/session.service';

import { GET } from './route';

vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`);
  }),
}));
vi.mock('@/services/app/session.service', () => ({ refreshSession: vi.fn() }));

const request = (redirectParam?: string) => {
  const url = new URL('/api/auth/refresh', 'https://app.example.com');

  if (redirectParam) url.searchParams.set('redirect', redirectParam);

  return new NextRequest(url);
};

const redirectedTo = () => new URL(vi.mocked(redirect).mock.calls[0]![0], 'https://app.example.com');

beforeEach(() => {
  vi.mocked(refreshSession).mockReset();
  vi.mocked(redirect).mockClear();
});

describe('/api/auth/refresh', () => {
  it('refreshes and returns to the page', async () => {
    vi.mocked(refreshSession).mockResolvedValue(true);

    await expect(GET(request(encodeRedirectPath('/dashboard?tab=2')!))).rejects.toThrow('NEXT_REDIRECT');
    expect(redirect).toHaveBeenCalledWith('/dashboard?tab=2');
  });

  it.each([
    ['the rsc header', new NextRequest('https://app.example.com/api/auth/refresh', { headers: { rsc: '1' } })],
    ['the _rsc parameter', new NextRequest('https://app.example.com/api/auth/refresh?_rsc=abc')],
  ])('answers a client-side navigation (%s) with a full page load, without refreshing', async (_name, req) => {
    const res = await GET(req);

    expect(res.status).toBe(204);
    expect(refreshSession).not.toHaveBeenCalled();
  });

  it('goes home without a page to return to', async () => {
    vi.mocked(refreshSession).mockResolvedValue(true);

    await expect(GET(request())).rejects.toThrow('NEXT_REDIRECT');
    expect(redirect).toHaveBeenCalledWith('/');
  });

  it('never returns to another site', async () => {
    vi.mocked(refreshSession).mockResolvedValue(true);

    await expect(GET(request('https://evil.example'))).rejects.toThrow('NEXT_REDIRECT');
    expect(redirect).toHaveBeenCalledWith('/');
  });

  it('ends the session through /api/auth/clear when the refresh token is rejected', async () => {
    vi.mocked(refreshSession).mockResolvedValue(false);

    await expect(GET(request(encodeRedirectPath('/dashboard')!))).rejects.toThrow('NEXT_REDIRECT');
    expect(redirectedTo().pathname).toBe('/api/auth/clear');
    expect(decodeRedirectPath(redirectedTo().searchParams.get('redirect'))).toBe('/dashboard');
  });

  it('ends the session without a return page', async () => {
    vi.mocked(refreshSession).mockResolvedValue(false);

    await expect(GET(request())).rejects.toThrow('NEXT_REDIRECT');
    expect(redirect).toHaveBeenCalledWith('/api/auth/clear');
  });

  it('lets an API outage surface instead of redirecting back', async () => {
    vi.mocked(refreshSession).mockRejectedValue(new ApiError('Timeout', 504));

    await expect(GET(request(encodeRedirectPath('/dashboard')!))).rejects.toMatchObject({ status: 504 });
    expect(redirect).not.toHaveBeenCalled();
  });
});
