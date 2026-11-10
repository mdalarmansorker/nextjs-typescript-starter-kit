import { expect, test } from '@playwright/test';

test('home page renders without console errors', async ({ page }) => {
  const errors: string[] = [];

  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', error => errors.push(error.message));

  await page.goto('/');

  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Log in' })).toBeVisible();
  await page.waitForLoadState('networkidle');
  expect(errors).toEqual([]);
});

test('unknown pages show the not-found page with a 404', async ({ page }) => {
  const response = await page.goto('/this-page-does-not-exist');

  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
  await expect(page).toHaveTitle(/^Page not found \| /);
});

test('responses carry the security headers', async ({ request }) => {
  const headers = (await request.get('/')).headers();

  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['x-frame-options']).toBe('DENY');
  expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
  expect(headers['x-powered-by']).toBeUndefined();
});

test('robots.txt keeps crawlers out of the API and protected pages', async ({ request }) => {
  const body = await (await request.get('/robots.txt')).text();

  expect(body).toContain('Disallow: /api/');
  expect(body).toContain('Disallow: /dashboard');
  expect(body).toMatch(/Sitemap: .*\/sitemap\.xml/);
});

test('the sitemap and social preview image are served', async ({ request }) => {
  const sitemap = await request.get('/sitemap.xml');
  const image = await request.get('/opengraph-image');

  expect(sitemap.ok()).toBe(true);
  expect(await sitemap.text()).toContain('<urlset');
  expect(image.headers()['content-type']).toBe('image/png');
});
