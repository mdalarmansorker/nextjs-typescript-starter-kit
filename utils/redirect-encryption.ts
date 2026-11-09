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
 * This is only intended for reversing URL obfuscation.
 *
 * @param encryptedUrl - URL-safe encrypted redirect value.
 * @returns Original redirect URL, or null when decryption fails.
 */
export const decryptRedirectUrl = (encryptedUrl: string): string | null => {
  if (!encryptedUrl) {
    return null;
  }

  try {
    const restored = fromUrlSafeBase64(encryptedUrl);

    const decrypted = CryptoJS.AES.decrypt(restored, REDIRECT_ENCRYPTION_KEY).toString(CryptoJS.enc.Utf8);

    return decrypted || null;
  } catch {
    return null;
  }
};
