import { describe, expect, it } from 'vitest';

import { assertValidEnv, validateEnv } from './validate-env';

const KEY = Buffer.alloc(32, 1).toString('base64');
const valid = { API_URL: 'http://localhost:8000/api' };

describe('validateEnv', () => {
  it('accepts the minimum configuration', () => {
    expect(validateEnv(valid)).toEqual([]);
  });

  it('accepts every variable set correctly', () => {
    expect(
      validateEnv({
        ...valid,
        NEXT_PUBLIC_APP_URL: 'https://app.example.com',
        ENCRYPTION_KEY: KEY,
        ENCRYPTION_KEY_PREVIOUS: 'ab'.repeat(32),
        TRUSTED_CLIENT_IP_HEADER: 'cf-connecting-ip',
      }),
    ).toEqual([]);
  });

  it('treats blank optional variables as unset', () => {
    expect(
      validateEnv({ ...valid, ENCRYPTION_KEY: '', ENCRYPTION_KEY_PREVIOUS: '  ', NEXT_PUBLIC_APP_URL: '' }),
    ).toEqual([]);
  });

  it.each([
    [{}, 'API_URL is not set'],
    [{ API_URL: '' }, 'API_URL must be an http(s) URL'],
    [{ API_URL: 'localhost:8000' }, 'API_URL must be an http(s) URL'],
    [{ API_URL: 'ftp://api.example.com' }, 'API_URL must be an http(s) URL'],
    [{ ...valid, NEXT_PUBLIC_APP_URL: 'app.example.com' }, 'NEXT_PUBLIC_APP_URL must be an http(s) URL'],
    [{ ...valid, ENCRYPTION_KEY: 'too-short' }, 'ENCRYPTION_KEY must be a 32-byte'],
    [{ ...valid, ENCRYPTION_KEY: KEY, ENCRYPTION_KEY_PREVIOUS: 'x' }, 'ENCRYPTION_KEY_PREVIOUS must be a 32-byte'],
    [{ ...valid, ENCRYPTION_KEY_PREVIOUS: KEY }, 'ENCRYPTION_KEY_PREVIOUS is set without ENCRYPTION_KEY'],
    [{ ...valid, TRUSTED_CLIENT_IP_HEADER: 'x-real-ip: 1' }, 'TRUSTED_CLIENT_IP_HEADER must be a header name'],
  ])('reports %j', (env, message) => {
    expect(validateEnv(env)).toEqual([expect.stringContaining(message)]);
  });
});

describe('assertValidEnv', () => {
  it('passes a valid environment', () => {
    expect(() => assertValidEnv(valid)).not.toThrow();
  });

  it('lists every problem in one error', () => {
    expect(() => assertValidEnv({ ENCRYPTION_KEY: 'bad' })).toThrow(
      /API_URL is not set[\s\S]*ENCRYPTION_KEY must be a 32-byte/,
    );
  });
});
