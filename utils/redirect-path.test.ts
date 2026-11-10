import { describe, expect, it } from 'vitest';

import { decodeRedirectPath, encodeRedirectPath, isSafeRedirectPath } from './redirect-path';

describe('encodeRedirectPath / decodeRedirectPath', () => {
  it.each(['/', '/projects/42?tab=settings&sort=desc', '/search?q=café ☕', '/a#section'])('round-trips %s', path => {
    const encoded = encodeRedirectPath(path);

    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(decodeRedirectPath(encoded)).toBe(path);
  });

  it.each(['https://evil.example', '//evil.example', '/\\evil.example', 'javascript:alert(1)', ''])(
    'refuses to encode %p',
    url => {
      expect(encodeRedirectPath(url)).toBeNull();
    },
  );

  it.each(['https://evil.example', '//evil.example', '/\\evil.example', 'javascript:alert(1)'])(
    'refuses to decode a crafted value for %s',
    url => {
      // Anyone can produce a value, so decoding must check it too.
      const crafted = Buffer.from(url).toString('base64url');

      expect(decodeRedirectPath(crafted)).toBeNull();
    },
  );

  it.each([null, undefined, '', 'not base64!', '%2Fdashboard', Buffer.from([0xff, 0xfe]).toString('base64url')])(
    'returns null for the malformed value %p',
    value => {
      expect(decodeRedirectPath(value)).toBeNull();
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
