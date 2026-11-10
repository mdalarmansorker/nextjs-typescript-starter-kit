/**
 * Carries "the page to return to after login" in a `?redirect=` query parameter.
 *
 * The path is Base64URL-encoded so it reads as one opaque token in the address bar and survives
 * nesting inside other URLs. This is NOT security: anyone can decode or create a value. What makes it
 * safe is that only paths on this site are accepted, on the way in and on the way out, so a crafted
 * link can't send users to another site after they log in.
 *
 * Works on the server, in the proxy and in the browser.
 */

/**
 * True for a path on this site (`/dashboard?tab=1`), false for anything that leaves it:
 * absolute URLs, protocol-relative `//host` and `/\host` (browsers read both as another host),
 * and values with control characters.
 */
export const isSafeRedirectPath = (value: string): boolean => {
  return /^\/(?![/\\])/.test(value) && !/\p{Cc}/u.test(value);
};

const toBase64Url = (bytes: Uint8Array): string => {
  let binary = '';

  for (const byte of bytes) binary += String.fromCharCode(byte);

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const fromBase64Url = (value: string): Uint8Array => {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='));

  return Uint8Array.from(binary, char => char.charCodeAt(0));
};

/**
 * Encodes a path for a `?redirect=` parameter.
 *
 * @returns The encoded value, or null when `path` is not a path on this site.
 */
export const encodeRedirectPath = (path: string): string | null => {
  if (!isSafeRedirectPath(path)) return null;

  return toBase64Url(new TextEncoder().encode(path));
};

/**
 * Decodes a `?redirect=` value made by `encodeRedirectPath`.
 *
 * @returns The path, or null when the value is malformed or doesn't decode to a path on this site.
 */
export const decodeRedirectPath = (value: string | null | undefined): string | null => {
  if (!value || !/^[A-Za-z0-9_-]+$/.test(value)) return null;

  try {
    const path = new TextDecoder('utf-8', { fatal: true }).decode(fromBase64Url(value));

    return isSafeRedirectPath(path) ? path : null;
  } catch {
    return null;
  }
};
