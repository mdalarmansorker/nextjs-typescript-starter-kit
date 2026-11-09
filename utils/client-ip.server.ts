import 'server-only';

import { headers } from 'next/headers';

/* A plain IPv4 / IPv6 address, so a header can't smuggle anything else to the API */
const IP_ADDRESS = /^[0-9a-fA-F:.]{2,45}$/;

/**
 * The visitor's address, for the API's per-address limits (e.g. failed logins).
 *
 * Only read from the header named by `TRUSTED_CLIENT_IP_HEADER` (e.g. `cf-connecting-ip` behind
 * Cloudflare, `x-real-ip` behind nginx): the proxy in front of this server sets it and overwrites
 * what a browser sends. Without it nothing is trusted (a browser could fake any address).
 *
 * @returns The address, or null when it isn't known.
 */
export const getClientIp = async (): Promise<string | null> => {
  const headerName = process.env.TRUSTED_CLIENT_IP_HEADER?.trim().toLowerCase();

  if (!headerName) return null;

  try {
    // A proxy appending to a list puts the address it saw last.
    const value = (await headers()).get(headerName)?.split(',').at(-1)?.trim();

    return value && IP_ADDRESS.test(value) ? value : null;
  } catch {
    // Outside a request (e.g. at build time) there is no visitor.
    return null;
  }
};
