import { headers } from 'next/headers';

import { describe, expect, it, vi } from 'vitest';

import { getClientIp } from './client-ip.server';

vi.mock('next/headers', () => ({ headers: vi.fn() }));

const withHeaders = (values: Record<string, string>) => {
  vi.mocked(headers).mockResolvedValue(new Headers(values) as never);
};

describe('getClientIp', () => {
  it('returns null when no trusted header is configured', async () => {
    withHeaders({ 'x-real-ip': '203.0.113.7' });

    expect(await getClientIp()).toBeNull();
  });

  it('reads the configured header', async () => {
    vi.stubEnv('TRUSTED_CLIENT_IP_HEADER', 'X-Real-IP');
    withHeaders({ 'x-real-ip': '203.0.113.7' });

    expect(await getClientIp()).toBe('203.0.113.7');
  });

  it('takes the last address of a list', async () => {
    vi.stubEnv('TRUSTED_CLIENT_IP_HEADER', 'x-forwarded-for');
    withHeaders({ 'x-forwarded-for': '10.0.0.1, 2001:db8::1' });

    expect(await getClientIp()).toBe('2001:db8::1');
  });

  it('ignores a value that is not an address', async () => {
    vi.stubEnv('TRUSTED_CLIENT_IP_HEADER', 'x-real-ip');
    withHeaders({ 'x-real-ip': '1.2.3.4 OR 1=1' });

    expect(await getClientIp()).toBeNull();
  });

  it('returns null outside a request', async () => {
    vi.stubEnv('TRUSTED_CLIENT_IP_HEADER', 'x-real-ip');
    vi.mocked(headers).mockRejectedValue(new Error('headers() was called outside a request scope'));

    expect(await getClientIp()).toBeNull();
  });
});
