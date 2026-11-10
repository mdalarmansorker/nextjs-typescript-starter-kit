import CryptoJS from 'crypto-js';

const REDIRECT_ENCRYPTION_KEY = 'not_a_secret_just_hide';

/**
 * Converts standard Base64 to URL-safe Base64.
 */
const toUrlSafeBase64 = (value: string): string => {
  return value.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

/**
 * Converts URL-safe Base64 back to standard Base64.
 */
const fromUrlSafeBase64 = (value: string): string => {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');

  return base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
};

/**
 * True for a path on this site (`/dashboard?tab=1`), false for anything that leaves it:
 * absolute URLs, protocol-relative `//host` and `/\host` (browsers read both as another host),
 * and values with control characters.
 */
export const isSafeRedirectPath = (value: string): boolean => {
  return /^\/(?![/\\])/.test(value) && !/\p{Cc}/u.test(value);
};

/**
 * Encrypts a redirect URL using a non-secret key.
 *
 * This is only intended to hide the URL from being immediately readable.
 * It must NOT be treated as a security mechanism.
 *
 * @param url - Redirect URL to obfuscate.
 * @returns URL-safe encrypted value, or null when encryption fails.
 */
export const encryptRedirectUrl = (url: string): string | null => {
  if (!url) {
    return null;
  }

  try {
    const encrypted = CryptoJS.AES.encrypt(url, REDIRECT_ENCRYPTION_KEY).toString();

    return toUrlSafeBase64(encrypted);
  } catch {
    return null;
  }
};

/**
 * Decrypts a redirect URL encrypted by encryptRedirectUrl.
 *
 * This is only intended for reversing URL obfuscation. The key is public, so anyone can produce a
 * value that decrypts. Only paths on this site are returned, so a crafted value can't redirect a
 * user to another site after login.
 *
 * @param encryptedUrl - URL-safe encrypted redirect value.
 * @returns The original path, or null when decryption fails or the result is not a path on this site.
 */
export const decryptRedirectUrl = (encryptedUrl: string): string | null => {
  if (!encryptedUrl) {
    return null;
  }

  try {
    const restored = fromUrlSafeBase64(encryptedUrl);

    const decrypted = CryptoJS.AES.decrypt(restored, REDIRECT_ENCRYPTION_KEY).toString(CryptoJS.enc.Utf8);

    return decrypted && isSafeRedirectPath(decrypted) ? decrypted : null;
  } catch {
    return null;
  }
};
