import 'server-only';

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

import { parseEncryptionKey } from './encryption-key';

type JsonPrimitive = string | number | boolean;
type JsonNested = JsonValue | null;
type JsonValue = JsonPrimitive | JsonNested[] | { [key: string]: JsonNested };

/**
 * Top-level data that can be encrypted.
 * Literal `null` is disallowed at the root so that `null` returned from decryption
 * unambiguously means failure. Nested `null` (in arrays and objects) is allowed.
 * At runtime `encryptData` enforces this contract strictly: only finite numbers, strings, booleans, null,
 * arrays and plain objects are accepted. Anything JSON would silently drop or rewrite (undefined, functions,
 * symbols, bigint, NaN / Infinity, Date, Map, Set, Buffer, class instances, objects with toJSON) is rejected.
 */
export type EncryptableData = JsonValue;

export interface EncryptOptions {
  /** Lifetime in seconds. After this, decryption returns null. Omit for no expiry. */
  ttlSeconds?: number | undefined;
}

export interface DecryptOptions<T> {
  /**
   * Runtime shape check applied after authentication (e.g. `(d): d is Foo => FooSchema.safeParse(d).success`).
   * If it returns false (or throws), decryption returns null.
   */
  validate?: ((data: unknown) => data is T) | undefined;
}

export interface DecryptResult<T> {
  data: T;
  /** True when the value was decrypted with ENCRYPTION_KEY_PREVIOUS and should be re-encrypted. */
  rotated: boolean;
}

interface Envelope {
  d: JsonValue;
  exp?: number;
}

const ALGORITHM = 'aes-256-gcm';
// v1 wraps the payload in an envelope ({ d, exp? }) to support authenticated expiry.
const VERSION = 'v1';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
// Minimum Base64URL characters for 28 bytes (12-byte IV + 16-byte Auth Tag): ceil(28 * 4 / 3) = 38
const MIN_ENCODED_LENGTH = 38;
// Upper bound on the Base64URL part (about 48 KiB of plaintext). Enforced on both encrypt and decrypt so
// attacker-supplied input cannot force large allocations and we never emit a value we would refuse to read.
const MAX_ENCODED_LENGTH = 64 * 1024;
// Largest serialized payload whose encoded form still fits MAX_ENCODED_LENGTH (Base64URL turns 3 bytes into 4
// characters, and the IV plus tag add 28 bytes). Checked before encrypting so oversized input fails fast.
const MAX_PLAINTEXT_BYTES = Math.floor((MAX_ENCODED_LENGTH * 3) / 4) - IV_LENGTH - TAG_LENGTH;
const BASE64URL_REGEX = /^[A-Za-z0-9_-]+$/;

let primaryKey: Buffer | null = null;
let previousKey: Buffer | null = null;

/**
 * Lazily loads and caches the encryption keys on first use.
 *
 * Lazy loading avoids throwing at module-evaluation time during `next build` or CI image builds
 * where secrets are not injected. Configuration errors THROW (fail loud) so a bad deploy is
 * visible instead of silently invalidating every value. A malformed ENCRYPTION_KEY_PREVIOUS also
 * throws, on purpose: silently ignoring it would make old data undecryptable without a signal.
 * A blank ENCRYPTION_KEY_PREVIOUS (empty or whitespace only) counts as "not configured", because blanking
 * the variable is the usual way to finish a rotation and many deploy tools cannot truly unset it.
 *
 * Keys are cached for the lifetime of the module, so tests that change process.env must reset modules.
 */
const getKeys = (): { primary: Buffer; previous: Buffer | null } => {
  if (primaryKey) {
    return { primary: primaryKey, previous: previousKey };
  }

  const rawKey = process.env.ENCRYPTION_KEY?.trim();
  if (!rawKey) {
    throw new Error('ENCRYPTION_KEY is not defined in environment variables.');
  }

  const primary = parseEncryptionKey(rawKey, 'ENCRYPTION_KEY');

  const rawPrevKey = process.env.ENCRYPTION_KEY_PREVIOUS?.trim();
  const previous = rawPrevKey ? parseEncryptionKey(rawPrevKey, 'ENCRYPTION_KEY_PREVIOUS') : null;

  // Assign only after both parsed successfully so a failure never leaves half-initialized state.
  primaryKey = primary;
  previousKey = previous;

  return { primary, previous };
};

/**
 * Builds the additional authenticated data (AAD) for a value.
 *
 * The AAD is not encrypted, but it is covered by the auth tag. Binding the format version and an
 * optional context (e.g. `'permissions-cookie'`) ensures ciphertext encrypted for one purpose cannot be
 * reused in another context (prevents cookie/token swapping attacks).
 */
const buildAad = (context?: string): Buffer =>
  Buffer.from(context === undefined ? VERSION : `${VERSION}:${context}`, 'utf8');

/**
 * True for plain objects: prototype is null or a realm's root Object.prototype (so it also works for objects
 * created in another realm, e.g. vm contexts or Jest). Class instances, Map, Set, Date, Buffer etc. are not.
 */
const isPlainObject = (value: object): boolean => {
  const proto: unknown = Object.getPrototypeOf(value);

  return proto === null || Object.getPrototypeOf(proto) === null;
};

/**
 * JSON.stringify replacer that enforces the JsonValue contract at runtime instead of letting JSON silently
 * drop or rewrite values. JSON.stringify drives the recursion, so nested values are covered as well.
 *
 * `value` has already passed through toJSON() when the replacer runs, so the original is read from `this[key]`.
 */
function strictJsonReplacer(this: Record<string, unknown>, key: string, value: unknown): unknown {
  const raw = this[key];

  switch (typeof raw) {
    case 'string':
    case 'boolean':
      return value;
    case 'number':
      if (!Number.isFinite(raw)) {
        throw new Error('Non-finite numbers cannot be encrypted.');
      }
      return value;
    case 'object':
      if (raw === null || Array.isArray(raw)) {
        return value;
      }
      if (isPlainObject(raw) && typeof (raw as { toJSON?: unknown }).toJSON !== 'function') {
        return value;
      }
      throw new Error('Only plain objects and arrays can be encrypted.');
    default:
      throw new Error(`Values of type "${typeof raw}" cannot be encrypted.`);
  }
}

/**
 * Encrypts JSON-compatible data with AES-256-GCM using the active ENCRYPTION_KEY.
 *
 * Configuration errors (missing/malformed keys) throw. Operational failures (bad input,
 * serialization, oversized output) are logged and return null.
 *
 * @param data - Non-null JSON-compatible data to encrypt.
 * @param context - Purpose label (e.g. `'permissions-cookie'`). The same label must be provided when decrypting.
 * @param options - Optional settings such as `ttlSeconds` for expiry.
 * @returns `v1.<base64url(iv | ciphertext | auth tag)>`, or null when encryption fails.
 */
export const encryptData = (data: EncryptableData, context?: string, options: EncryptOptions = {}): string | null => {
  // Config errors must surface, so this stays outside the try/catch.
  const { primary } = getKeys();

  // Runtime guard: the type forbids root null/undefined, but JS callers and casts can bypass types.
  const root: unknown = data;
  if (root === null || root === undefined) {
    console.error('Failed to encrypt data: root value must not be null or undefined.');
    return null;
  }

  const { ttlSeconds } = options;
  if (ttlSeconds !== undefined && (!Number.isFinite(ttlSeconds) || ttlSeconds <= 0)) {
    console.error('Failed to encrypt data: ttlSeconds must be a positive finite number.');
    return null;
  }

  try {
    const envelope: Envelope =
      ttlSeconds === undefined ? { d: data } : { d: data, exp: Date.now() + ttlSeconds * 1000 };
    const serialized = JSON.stringify(envelope, strictJsonReplacer);

    // Fail fast, before any cipher work. (JSON.stringify above still allocates the string, so callers
    // handling large or untrusted input should bound its size upstream as well.)
    if (Buffer.byteLength(serialized, 'utf8') > MAX_PLAINTEXT_BYTES) {
      console.error('Failed to encrypt data: payload exceeds the maximum supported size.');
      return null;
    }

    // A fresh random 96-bit IV for every call; reusing an IV with the same key destroys GCM security.
    // Random IVs are safe for typical volumes (stay well under ~2^32 encryptions per key, per NIST SP 800-38D).
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, primary, iv, { authTagLength: TAG_LENGTH });

    cipher.setAAD(buildAad(context));

    const encrypted = Buffer.concat([cipher.update(serialized, 'utf8'), cipher.final(), cipher.getAuthTag()]);

    return `${VERSION}.${Buffer.concat([iv, encrypted]).toString('base64url')}`;
  } catch (error) {
    console.error('Failed to encrypt data:', error);
    return null;
  }
};

/**
 * Attempts decryption with one key. Returns the parsed envelope, or null on any failure.
 */
const tryDecrypt = (key: Buffer, iv: Buffer, ciphertextAndTag: Buffer, context?: string): Envelope | null => {
  try {
    const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });

    decipher.setAAD(buildAad(context));
    decipher.setAuthTag(ciphertextAndTag.subarray(ciphertextAndTag.length - TAG_LENGTH));

    // final() throws when the auth tag does not match (tampered, wrong key, or wrong context).
    const decrypted = Buffer.concat([
      decipher.update(ciphertextAndTag.subarray(0, ciphertextAndTag.length - TAG_LENGTH)),
      decipher.final(),
    ]);

    const parsed: unknown = JSON.parse(decrypted.toString('utf8'));

    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return null;
    }

    const { d, exp } = parsed as { d?: unknown; exp?: unknown };

    if (d === null || d === undefined) {
      return null;
    }

    if (exp === undefined) {
      return { d: d as JsonValue };
    }

    // Rejects non-numbers and NaN/Infinity (a NaN exp would otherwise never expire).
    if (typeof exp !== 'number' || !Number.isFinite(exp)) {
      return null;
    }

    return { d: d as JsonValue, exp };
  } catch {
    return null;
  }
};

/**
 * Decrypts a value and also reports whether it needs re-encryption (key rotation).
 *
 * Supports zero-downtime key rotation: if the primary key fails, `ENCRYPTION_KEY_PREVIOUS`
 * (if configured) is tried and `rotated: true` is returned. Callers should then re-issue the
 * value with `encryptData` (e.g. re-set the cookie), so ENCRYPTION_KEY_PREVIOUS can eventually be removed.
 *
 * Configuration errors throw. Malformed, tampered, expired, wrong-context, or invalid-shape
 * values return null.
 */
export const decryptDataWithMeta = <T = unknown>(
  value: unknown,
  context?: string,
  options: DecryptOptions<T> = {},
): DecryptResult<T> | null => {
  // Config errors must surface (not be reported as "invalid value"), so resolve keys first.
  const { primary, previous } = getKeys();

  if (typeof value !== 'string' || !value.startsWith(`${VERSION}.`)) {
    return null;
  }

  const encoded = value.slice(VERSION.length + 1);

  // Fast pre-validation: length bounds and strict Base64URL charset before buffer allocation.
  if (encoded.length < MIN_ENCODED_LENGTH || encoded.length > MAX_ENCODED_LENGTH || !BASE64URL_REGEX.test(encoded)) {
    return null;
  }

  const data = Buffer.from(encoded, 'base64url');

  // Reject non-canonical encodings. Node's decoder ignores unused trailing bits, so several strings could
  // otherwise map to the same bytes; requiring an exact round trip makes each value's encoding unique.
  if (data.toString('base64url') !== encoded) {
    return null;
  }

  if (data.length <= IV_LENGTH + TAG_LENGTH) {
    return null;
  }

  const iv = data.subarray(0, IV_LENGTH);
  const ciphertextAndTag = data.subarray(IV_LENGTH);

  let envelope = tryDecrypt(primary, iv, ciphertextAndTag, context);
  let rotated = false;

  if (!envelope && previous) {
    envelope = tryDecrypt(previous, iv, ciphertextAndTag, context);
    rotated = envelope !== null;
  }

  if (!envelope) {
    return null;
  }

  // Expiry is checked only after authentication, so it cannot be forged.
  // Uses the local server clock: with several servers, keep TTLs well above expected clock skew
  // (minutes, not seconds).
  if (envelope.exp !== undefined && Date.now() >= envelope.exp) {
    return null;
  }

  if (options.validate) {
    try {
      if (!options.validate(envelope.d)) {
        return null;
      }
    } catch (error) {
      // A throwing validator (e.g. schema.parse) is a caller bug; treat the value as invalid, not as a crash.
      console.error('Decrypted data validator threw:', error);
      return null;
    }
  }

  return { data: envelope.d as T, rotated };
};

/**
 * Decrypts data encrypted by `encryptData`.
 *
 * Prefer passing `options.validate` so the returned type is checked at runtime instead of cast.
 * Use `decryptDataWithMeta` if you need to know whether the value should be re-encrypted.
 *
 * @template T Expected decrypted data type.
 * @param value - Encrypted string in format `v1.<base64url>`.
 * @param context - Purpose label used when the data was encrypted.
 * @param options - Optional validation callback.
 * @returns Decrypted data typed as `T`, or null when the value is malformed, expired, from another
 * context, failed validation, or was tampered with.
 */
export const decryptData = <T = unknown>(value: unknown, context?: string, options: DecryptOptions<T> = {}): T | null =>
  decryptDataWithMeta<T>(value, context, options)?.data ?? null;
