import { describe, expect, it, vi } from 'vitest';

import { assertValidEnv, envWarnings, validateEnv } from './validate-env';

const KEY = Buffer.alloc(32, 1).toString('base64');
const valid = { API_URL: 'http://localhost:8000/api' };

describe('validateEnv', () => {
  it('accepts the minimum configuration', () => {
    expect(validateEnv(valid)).toEqual([]);
  });

  it('accepts a missing API_URL, so the UI can run before the API exists', () => {
    expect(validateEnv({})).toEqual([]);
    expect(validateEnv({ API_URL: '  ' })).toEqual([]);
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

describe('envWarnings', () => {
  it.each([{}, { API_URL: '' }, { API_URL: '  ' }])('warns when API_URL is unset: %j', env => {
    expect(envWarnings(env)).toEqual([expect.stringContaining('API_URL is not set')]);
  });

  it('has nothing to say when API_URL is set', () => {
    expect(envWarnings(valid)).toEqual([]);
  });
});

describe('assertValidEnv', () => {
  it('passes a valid environment without warnings', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(() => assertValidEnv(valid)).not.toThrow();
    expect(warn).not.toHaveBeenCalled();
  });

  it('starts without API_URL and warns about it', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(() => assertValidEnv({})).not.toThrow();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('API_URL is not set'));
  });

  it('lists every problem in one error', () => {
    expect(() => assertValidEnv({ API_URL: 'localhost:8000', ENCRYPTION_KEY: 'bad' })).toThrow(
      /API_URL must be an http\(s\) URL[\s\S]*ENCRYPTION_KEY must be a 32-byte/,
    );
  });
});
