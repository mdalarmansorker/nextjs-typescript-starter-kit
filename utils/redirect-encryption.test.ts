import { describe, expect, it } from 'vitest';

import { decryptRedirectUrl, encryptRedirectUrl, isSafeRedirectPath } from './redirect-encryption';

describe('redirect encryption', () => {
  it('round-trips a path with a query string', () => {
    const path = '/projects/42?tab=settings&sort=desc';
    const encrypted = encryptRedirectUrl(path);

    expect(encrypted).not.toBeNull();
    expect(decryptRedirectUrl(encrypted!)).toBe(path);
  });

  it('produces a value that is safe in a query string', () => {
    // Repeat with several inputs: a random salt decides whether `+`, `/` or `=` would appear.
    for (let i = 0; i < 20; i++) {
      expect(encryptRedirectUrl(`/page/${i}?q=${'x'.repeat(i)}`)).toMatch(/^[A-Za-z0-9_-]+$/);
    }
  });

  it('returns null for an empty input', () => {
    expect(encryptRedirectUrl('')).toBeNull();
    expect(decryptRedirectUrl('')).toBeNull();
  });

  it('returns null for a value it did not produce', () => {
    expect(decryptRedirectUrl('not-an-encrypted-value')).toBeNull();
  });

  it.each(['https://evil.example', '//evil.example', '/\\evil.example', 'javascript:alert(1)'])(
    'refuses to return %s, which leaves the site',
    url => {
      // The key is public, so an attacker can encrypt any URL themselves.
      expect(decryptRedirectUrl(encryptRedirectUrl(url)!)).toBeNull();
    },
  );
});

describe('isSafeRedirectPath', () => {
  it.each(['/', '/dashboard', '/a/b?c=d#e', '/search?q=//x'])('accepts %s', path => {
    expect(isSafeRedirectPath(path)).toBe(true);
  });

  it.each(['', 'dashboard', 'https://evil.example', '//evil.example', '/\\evil.example', '/a\nb', '/\tx'])(
    'rejects %p',
    path => {
      expect(isSafeRedirectPath(path)).toBe(false);
    },
  );
});
