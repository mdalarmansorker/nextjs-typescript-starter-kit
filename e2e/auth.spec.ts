import { expect, test } from '@playwright/test';

import { COOKIE_NAMES } from '../constants/cookie';

const VALID_PASSWORD = 'correct-password'; // see e2e/mock-api.mjs

test.describe('logging in', () => {
  test('a protected page sends a logged-out user to login, and back after logging in', async ({ page }) => {
    await page.goto('/dashboard?tab=reports');

    await expect(page).toHaveURL(/\/login\?redirect=/);

    await page.getByLabel('Email').fill('ada@example.com');
    await page.getByLabel('Password').fill(VALID_PASSWORD);
    await page.getByRole('button', { name: 'Log in' }).click();

    await expect(page).toHaveURL('/dashboard?tab=reports');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });

  test('the access token is stored where page scripts cannot read it', async ({ page, context }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('ada@example.com');
    await page.getByLabel('Password').fill(VALID_PASSWORD);
    await page.getByRole('button', { name: 'Log in' }).click();
    await expect(page).toHaveURL('/dashboard');

    const token = (await context.cookies()).find(cookie => cookie.name === COOKIE_NAMES.ACCESS_TOKEN);

    expect(token).toMatchObject({ value: 'e2e-token', httpOnly: true, sameSite: 'Lax' });
    expect(await page.evaluate(() => document.cookie)).not.toContain(COOKIE_NAMES.ACCESS_TOKEN);
  });

  test('wrong credentials show the API’s message and keep the email', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('ada@example.com');
    await page.getByLabel('Password').fill('wrong');
    await page.getByRole('button', { name: 'Log in' }).click();

    // Filter by text: Next.js adds its own empty role="alert" route announcer to every page.
    await expect(page.getByRole('alert').filter({ hasText: 'These credentials' })).toHaveText(
      'These credentials do not match our records.',
    );
    await expect(page.getByLabel('Email')).toHaveValue('ada@example.com');
    await expect(page).toHaveURL('/login');
  });

  test('an invalid email is caught before calling the API', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('not-an-email');
    await page.getByRole('button', { name: 'Log in' }).click();

    await expect(page.getByLabel('Email')).toHaveAccessibleDescription('Enter a valid email address.');
  });

  test('a logged-in user visiting login goes to the dashboard', async ({ page, context, baseURL }) => {
    await context.addCookies([{ name: COOKIE_NAMES.ACCESS_TOKEN, value: 'e2e-token', url: baseURL! }]);

    await page.goto('/login');

    await expect(page).toHaveURL('/dashboard');
  });
});

test.describe('logging out', () => {
  test('the logout button revokes the token and clears the session', async ({ page, context, baseURL, request }) => {
    const token = `logout-${Date.now()}`;

    await context.addCookies([
      ...Object.values(COOKIE_NAMES).map(name => ({ name, value: token, url: baseURL! })),
      { name: 'unrelated', value: 'kept', url: baseURL! },
    ]);

    await page.goto('/dashboard');
    await page.getByRole('button', { name: 'Log out' }).click();

    await expect(page).toHaveURL('/');
    expect((await context.cookies()).map(cookie => cookie.name)).toEqual(['unrelated']);
    expect(await (await request.get('http://127.0.0.1:4010/revoked-tokens')).json()).toContain(token);

    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

  test('an expired session sends the user to login, keeping the redirect', async ({ request }) => {
    const response = await request.get('/api/auth/clear?redirect=abc', { maxRedirects: 0 });
    const location = new URL(response.headers().location ?? '', 'http://localhost');

    expect(response.status()).toBe(307);
    expect(location.pathname).toBe('/login');
    expect(location.searchParams.get('redirect')).toBe('abc');
  });

  test('another site cannot log a user out', async ({ request, baseURL }) => {
    const response = await request.get('/api/auth/clear', {
      maxRedirects: 0,
      headers: { 'Sec-Fetch-Site': 'cross-site', Cookie: `${COOKIE_NAMES.ACCESS_TOKEN}=e2e-token` },
    });

    expect(response.status()).toBe(307);
    expect(response.headers()['set-cookie'] ?? '').not.toContain(COOKIE_NAMES.ACCESS_TOKEN);
    expect(baseURL).toBeTruthy();
  });
});
