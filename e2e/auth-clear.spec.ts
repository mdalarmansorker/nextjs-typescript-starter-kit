import { expect, test } from '@playwright/test';

import { COOKIE_NAMES } from '../constants/cookie';

test('clearing the session removes the auth cookies and returns home', async ({ page, context, baseURL }) => {
  await context.addCookies(Object.values(COOKIE_NAMES).map(name => ({ name, value: 'stale', url: baseURL! })));
  await context.addCookies([{ name: 'unrelated', value: 'kept', url: baseURL! }]);

  await page.goto('/api/auth/clear');

  await expect(page).toHaveURL('/');

  const names = (await context.cookies()).map(cookie => cookie.name);

  expect(names).toEqual(['unrelated']);
});

test('clearing the session with a redirect sends the user to login', async ({ request }) => {
  const response = await request.get('/api/auth/clear?redirect=abc', { maxRedirects: 0 });

  const location = new URL(response.headers().location);

  expect(response.status()).toBe(307);
  expect(location.pathname).toBe('/login');
  expect(location.searchParams.get('redirect')).toBe('abc');
});
