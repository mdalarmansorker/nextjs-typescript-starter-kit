import { randomBytes } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type EncryptionModule = typeof import('./encryption.server');

const KEY = randomBytes(32).toString('base64');
const OTHER_KEY = randomBytes(32).toString('hex');

/**
 * The module caches its keys on first use, so each test loads a fresh copy after setting the env.
 */
const load = async (env: { key?: string; previous?: string } = { key: KEY }): Promise<EncryptionModule> => {
  vi.stubEnv('ENCRYPTION_KEY', env.key ?? '');
  vi.stubEnv('ENCRYPTION_KEY_PREVIOUS', env.previous ?? '');
  vi.resetModules();

  return import('./encryption.server');
};

beforeEach(() => {
  // Failures are logged on purpose; keep the test output readable.
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
});

describe('encryptData / decryptData', () => {
  it('round-trips JSON data', async () => {
    const { encryptData, decryptData } = await load();
    const data = { id: 1, roles: ['admin', 'editor'], active: true, manager: null };

    const encrypted = encryptData(data);

    expect(encrypted).toMatch(/^v1\.[A-Za-z0-9_-]+$/);
    expect(decryptData(encrypted)).toEqual(data);
  });

  it('uses a fresh IV, so equal input gives different output', async () => {
    const { encryptData } = await load();

    expect(encryptData('same')).not.toBe(encryptData('same'));
  });

  it('rejects a value encrypted for another context', async () => {
    const { encryptData, decryptData } = await load();
    const encrypted = encryptData(['users.view'], 'permissions-cookie');

    expect(decryptData(encrypted, 'permissions-cookie')).toEqual(['users.view']);
    expect(decryptData(encrypted, 'session-cookie')).toBeNull();
    expect(decryptData(encrypted)).toBeNull();
  });

  it('rejects a tampered value', async () => {
    const { encryptData, decryptData } = await load();
    const encrypted = encryptData({ admin: false })!;
    const last = encrypted.at(-1) === 'A' ? 'B' : 'A';

    expect(decryptData(encrypted.slice(0, -1) + last)).toBeNull();
  });

  it.each([undefined, null, 42, '', 'v1.', 'v2.abc', `v1.${'!'.repeat(40)}`])(
    'returns null for the malformed value %p',
    async value => {
      const { decryptData } = await load();

      expect(decryptData(value)).toBeNull();
    },
  );

  it('expires a value after its TTL', async () => {
    vi.useFakeTimers();

    const { encryptData, decryptData } = await load();
    const encrypted = encryptData('short-lived', undefined, { ttlSeconds: 60 });

    vi.advanceTimersByTime(59_000);
    expect(decryptData(encrypted)).toBe('short-lived');

    vi.advanceTimersByTime(1_000);
    expect(decryptData(encrypted)).toBeNull();
  });

  it('applies the validate callback', async () => {
    const { encryptData, decryptData } = await load();
    const encrypted = encryptData({ id: 'abc' });
    const hasNumericId = (d: unknown): d is { id: number } =>
      typeof d === 'object' && d !== null && typeof (d as { id?: unknown }).id === 'number';

    expect(decryptData(encrypted, undefined, { validate: hasNumericId })).toBeNull();
  });

  it.each([
    ['a Date', new Date()],
    ['a Map', new Map()],
    ['NaN', Number.NaN],
    ['a nested function', { fn: () => {} }],
    ['a root null', null],
  ])('refuses to encrypt %s', async (_label, value) => {
    const { encryptData } = await load();

    expect(encryptData(value as never)).toBeNull();
  });

  it('refuses an invalid TTL', async () => {
    const { encryptData } = await load();

    expect(encryptData('x', undefined, { ttlSeconds: 0 })).toBeNull();
  });
});

describe('key configuration', () => {
  it('throws when ENCRYPTION_KEY is missing', async () => {
    const { encryptData } = await load({ key: '' });

    expect(() => encryptData('x')).toThrow('ENCRYPTION_KEY is not defined');
  });

  it('throws when ENCRYPTION_KEY is malformed', async () => {
    const { encryptData } = await load({ key: 'too-short' });

    expect(() => encryptData('x')).toThrow('ENCRYPTION_KEY must be a valid 32-byte');
  });

  it('accepts a 64-character hex key', async () => {
    const { encryptData, decryptData } = await load({ key: OTHER_KEY });

    expect(decryptData(encryptData('hex'))).toBe('hex');
  });
});

describe('key rotation', () => {
  it('decrypts with the previous key and reports the value as rotated', async () => {
    const before = await load({ key: OTHER_KEY });
    const encrypted = before.encryptData({ user: 7 });

    const after = await load({ key: KEY, previous: OTHER_KEY });

    expect(after.decryptDataWithMeta(encrypted)).toEqual({ data: { user: 7 }, rotated: true });
  });

  it('does not mark a value encrypted with the current key as rotated', async () => {
    const { encryptData, decryptDataWithMeta } = await load({ key: KEY, previous: OTHER_KEY });

    expect(decryptDataWithMeta(encryptData('fresh'))).toEqual({ data: 'fresh', rotated: false });
  });

  it('cannot read old values once the previous key is removed', async () => {
    const before = await load({ key: OTHER_KEY });
    const encrypted = before.encryptData('old');

    const after = await load({ key: KEY });

    expect(after.decryptData(encrypted)).toBeNull();
  });
});
