'use server';

// TEST SETUP (academy backend): delete this file before committing.

import { handleRequest } from '@/services/api/base.service';

interface MeResponse {
  data: { user: { first_name: string; last_name: string; email: string } };
}

/** Called while the page renders (Server Component). */
export async function getProfileName(): Promise<string> {
  const me = await handleRequest<MeResponse>('/auth/v1/auth/me', { requiresAuth: true, cache: 'no-store' });

  return `${me.data.user.first_name} ${me.data.user.last_name} (${me.data.user.email})`;
}

/** Called from a button (server action). */
export async function checkProfileAction(_previous: string): Promise<string> {
  return `${await getProfileName()} at ${new Date().toLocaleTimeString()}`;
}
