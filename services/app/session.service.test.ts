import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/services/api/api-errors';
import { refreshTokens } from '@/services/api/auth-tokens';

import CookieService from './cookie.service';
import { canSaveSession, refreshSession, saveSession } from './session.service';

vi.mock('./cookie.service', () => ({ default: { store: vi.fn(), get: vi.fn() } }));
vi.mock('@/services/api/auth-tokens', () => ({ refreshTokens: vi.fn() }));

const NOW = new Date('2026-01-01T00:00:00Z');
const options = { httpOnly: true, secure: true, sameSite: 'lax', path: '/' };

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers({ now: NOW });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('saveSession', () => {
  it('stores the token in an httpOnly, secure, same-site cookie', async () => {
    await saveSession({ accessToken: 'abc' });

    expect(CookieService.store).toHaveBeenCalledOnce();
    expect(CookieService.store).toHaveBeenCalledWith('__at', 'abc', { expires: 15, ...options });
  });

  it('expires the access cookie 30 seconds before the token, and stores the refresh token', async () => {
    await saveSession({ accessToken: 'abc', refreshToken: 'ref', expiresIn: 3600 });

    expect(CookieService.store).toHaveBeenCalledWith('__at', 'abc', {
      expires: new Date(NOW.getTime() + 3570_000),
      ...options,
    });
    expect(CookieService.store).toHaveBeenCalledWith('__rt', 'ref', { expires: 15, ...options });
  });

  it('expires the refresh cookie with the refresh token when the API says when', async () => {
    await saveSession({ accessToken: 'abc', refreshToken: 'ref', refreshExpiresIn: 86400 });

    expect(CookieService.store).toHaveBeenCalledWith('__rt', 'ref', {
      expires: new Date(NOW.getTime() + 86400_000),
      ...options,
    });
  });

  it('keeps the full lifetime of a short-lived token', async () => {
    await saveSession({ accessToken: 'abc', expiresIn: 45 });

    expect(CookieService.store).toHaveBeenCalledWith('__at', 'abc', {
      expires: new Date(NOW.getTime() + 45_000),
      ...options,
    });
  });
});

describe('canSaveSession', () => {
  it('is false without a refresh token', async () => {
    expect(await canSaveSession()).toBe(false);
    expect(CookieService.store).not.toHaveBeenCalled();
  });

  it('is true where cookies can be set', async () => {
    vi.mocked(CookieService.get).mockResolvedValue('ref');

    expect(await canSaveSession()).toBe(true);
    expect(CookieService.store).toHaveBeenCalledWith('__rt', 'ref', { expires: 15, ...options });
  });

  it('is false where cookies are read-only (a Server Component)', async () => {
    vi.mocked(CookieService.get).mockResolvedValue('ref');
    vi.mocked(CookieService.store).mockRejectedValue(new Error('Cookies can only be modified in a Server Action'));

    expect(await canSaveSession()).toBe(false);
  });
});

describe('refreshSession', () => {
  it('is false without a refresh token', async () => {
    expect(await refreshSession()).toBe(false);
    expect(refreshTokens).not.toHaveBeenCalled();
  });

  it('stores the new tokens', async () => {
    vi.mocked(CookieService.get).mockResolvedValue('ref');
    vi.mocked(refreshTokens).mockResolvedValue({ accessToken: 'new', refreshToken: 'new-ref' });

    expect(await refreshSession()).toBe(true);
    expect(refreshTokens).toHaveBeenCalledWith('ref');
    expect(CookieService.store).toHaveBeenCalledWith('__at', 'new', expect.any(Object));
    expect(CookieService.store).toHaveBeenCalledWith('__rt', 'new-ref', expect.any(Object));
  });

  it('is false when the API rejects the refresh token', async () => {
    vi.mocked(CookieService.get).mockResolvedValue('ref');
    vi.mocked(refreshTokens).mockRejectedValue(new ApiError('Expired', 401));

    expect(await refreshSession()).toBe(false);
  });

  it('throws when the API is unavailable, so an outage does not log users out', async () => {
    vi.mocked(CookieService.get).mockResolvedValue('ref');
    vi.mocked(refreshTokens).mockRejectedValue(new ApiError('Timeout', 504));

    await expect(refreshSession()).rejects.toMatchObject({ status: 504 });
  });
});
