import { describe, expect, it, vi } from 'vitest';

import CookieService from './cookie.service';
import { saveSession } from './session.service';

vi.mock('./cookie.service', () => ({ default: { store: vi.fn() } }));

describe('saveSession', () => {
  it('stores the token in an httpOnly, secure, same-site cookie', async () => {
    await saveSession('abc');

    expect(CookieService.store).toHaveBeenCalledWith('__at', 'abc', {
      expires: 15,
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
    });
  });
});
