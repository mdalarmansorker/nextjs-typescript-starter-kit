/**
 * Validates and decodes a 32-byte key from Base64 or hex. Used by `encryption.server.ts` and by the
 * startup check in `validate-env.ts`.
 *
 * @throws When the key is neither a canonical 32-byte Base64 string nor 64 hex characters.
 */
export const parseEncryptionKey = (rawSecret: string, envName: string): Buffer => {
  const secret = rawSecret.trim();

  // 1. 64-character Hex key (32 bytes)
  if (/^[0-9a-fA-F]{64}$/.test(secret)) {
    return Buffer.from(secret, 'hex');
  }

  // 2. Canonical 32-byte Base64 key
  const base64Key = Buffer.from(secret, 'base64');
  if (base64Key.length === 32 && base64Key.toString('base64') === secret) {
    return base64Key;
  }

  throw new Error(
    `${envName} must be a valid 32-byte Base64-encoded key (e.g. openssl rand -base64 32) or a 64-character hex key.`,
  );
};
