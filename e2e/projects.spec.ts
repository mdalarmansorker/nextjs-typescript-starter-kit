import { expect, type Page, test } from '@playwright/test';

import { COOKIE_NAMES } from '../constants/cookie';

/** Tests share the mock API, so each one works on projects with its own unique names. */
const unique = (label: string) => `${label} ${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

const fillForm = async (page: Page, name: string, description = '') => {
  await page.getByLabel('Name').fill(name);
  await page.getByLabel('Description').fill(description);
};

test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([{ name: COOKIE_NAMES.ACCESS_TOKEN, value: 'e2e-token', url: baseURL! }]);
});

test('lists projects ten per page and moves between pages', async ({ page }) => {
  await page.goto('/projects');

  await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible();
  await expect(page.getByRole('listitem')).toHaveCount(10);
  await expect(page.getByText(/^Page 1 of \d+$/)).toBeVisible();

  await page.getByRole('link', { name: 'Next' }).click();

  await expect(page).toHaveURL('/projects?page=2');
  await expect(page.getByText(/^Page 2 of \d+$/)).toBeVisible();
  await expect(page.getByRole('link', { name: 'Previous' })).toBeVisible();
});

test('creates a project, showing validation errors first', async ({ page }) => {
  const name = unique('Apollo');

  await page.goto('/projects/new');

  // Caught by the server action's zod schema
  await page.getByRole('button', { name: 'Create project' }).click();
  await expect(page.getByLabel('Name')).toHaveAccessibleDescription('Enter a name.');

  // Caught by the API (422), shown on the field and keeping what was typed
  await fillForm(page, 'Seeded project 5', 'Notes');
  await page.getByRole('button', { name: 'Create project' }).click();
  await expect(page.getByLabel('Name')).toHaveAccessibleDescription('The name has already been taken.');
  await expect(page.getByLabel('Description')).toHaveValue('Notes');

  await fillForm(page, name, 'A new project');
  await page.getByRole('button', { name: 'Create project' }).click();

  await expect(page).toHaveURL('/projects');
  await expect(page.getByText(name)).toBeVisible();
});

test('edits a project', async ({ page }) => {
  const name = unique('Gemini');
  const renamed = unique('Gemini renamed');

  await page.goto('/projects/new');
  await fillForm(page, name);
  await page.getByRole('button', { name: 'Create project' }).click();
  await expect(page).toHaveURL('/projects');

  await page.getByRole('link', { name: `Edit ${name}` }).click();
  await expect(page.getByRole('heading', { name: `Edit ${name}` })).toBeVisible();
  await expect(page.getByLabel('Name')).toHaveValue(name);

  await fillForm(page, renamed, 'Updated');
  await page.getByRole('button', { name: 'Save changes' }).click();

  await expect(page).toHaveURL('/projects');
  await expect(page.getByText(renamed)).toBeVisible();
  await expect(page.getByText(name, { exact: true })).toHaveCount(0);
});

test('deletes a project', async ({ page }) => {
  const name = unique('Mercury');

  await page.goto('/projects/new');
  await fillForm(page, name);
  await page.getByRole('button', { name: 'Create project' }).click();
  await expect(page.getByText(name)).toBeVisible();

  await page.getByRole('button', { name: `Delete ${name}` }).click();

  await expect(page).toHaveURL('/projects');
  await expect(page.getByText(name)).toHaveCount(0);
});

test('an unknown project shows the 404 page', async ({ page }) => {
  const response = await page.goto('/projects/does-not-exist/edit');

  expect(response?.status()).toBe(404);
});

test('projects need a login', async ({ page, context }) => {
  await context.clearCookies();
  await page.goto('/projects');

  await expect(page).toHaveURL(/\/login\?redirect=/);
});
