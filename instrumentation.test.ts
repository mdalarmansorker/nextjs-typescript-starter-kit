import { beforeEach, describe, expect, it, vi } from 'vitest';

import { register } from './instrumentation';

describe('register', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_RUNTIME', 'nodejs');
    vi.stubEnv('NEXT_PHASE', '');
  });

  it('starts with a valid environment', async () => {
    vi.stubEnv('API_URL', 'http://localhost:8000/api');

    await expect(register()).resolves.toBeUndefined();
  });

  it('refuses to start with an invalid environment', async () => {
    vi.stubEnv('API_URL', 'not a url');

    await expect(register()).rejects.toThrow('Invalid environment variables');
  });

  it.each([
    ['during the build', 'NEXT_PHASE', 'phase-production-build'],
    ['in the edge runtime', 'NEXT_RUNTIME', 'edge'],
  ])('skips the check %s', async (_when, name, value) => {
    vi.stubEnv(name, value);
    vi.stubEnv('API_URL', 'not a url');

    await expect(register()).resolves.toBeUndefined();
  });
});
