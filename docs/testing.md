# Testing

| Kind               | Tool                           | Location         | Command            |
| ------------------ | ------------------------------ | ---------------- | ------------------ |
| Unit and component | Vitest + React Testing Library | Next to the code | `npm test`         |
| End-to-end         | Playwright                     | `e2e/`           | `npm run test:e2e` |

## Unit and component tests

```bash
npm test               # watch mode
npm run test:run       # once
npm run test:coverage  # once, with a coverage report in coverage/index.html
```

### Where tests go

Put the test next to the file it tests. The extension picks the environment:

| File name            | Environment     | Use for                                          |
| -------------------- | --------------- | ------------------------------------------------ |
| `something.test.ts`  | Node            | Utilities, services, route handlers, server code |
| `Something.test.tsx` | jsdom (browser) | React components and hooks                       |

A `.test.ts` file that needs browser APIs starts with `// @vitest-environment jsdom` (see `services/app/cookie.service.client.test.ts`).

### Setup

`vitest.config.mts` and `vitest.setup.ts` give every test:

- the `@/` import alias
- `@testing-library/jest-dom` matchers: `toBeInTheDocument()`, `toHaveTextContent()` and the rest
- a mocked `server-only`, so `*.server.ts` modules can be imported
- clean state: mocks, `vi.stubEnv` and `vi.stubGlobal` are undone and rendered components unmounted after each test

### Patterns

**Components.** Find elements by role and name as a user would, and interact with `userEvent`:

```tsx
render(<ErrorPage error={new Error('boom')} retry={retry} />);
await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
expect(retry).toHaveBeenCalledOnce();
```

**Next.js server APIs.** `cookies()`, `headers()`, `updateTag()` and `redirect()` need a request, so mock them:

```ts
vi.mock('next/headers', () => ({ cookies: vi.fn() }));

vi.mocked(cookies).mockResolvedValue(fakeCookieStore as never);
```

**Your own modules.** Mock the layer below the one you test, not the module itself. `services/api/server-request.test.ts` mocks `api.interceptor`; `api.interceptor.test.ts` mocks `fetch`.

**Environment variables.** Use `vi.stubEnv('NAME', 'value')`; it is reset after the test. If the module reads the variable once and caches it, call `vi.resetModules()` and import it again (see `utils/encryption.server.test.ts`).

**Server actions.** Call the action with a `FormData` and mock the services it uses. `redirect()` works by throwing, so mock it to throw and expect the rejection (see `app/login/actions.test.ts`):

```ts
vi.mock('next/navigation', () => ({
  redirect: vi.fn(() => {
    throw new Error('NEXT_REDIRECT');
  }),
}));

await expect(login({}, formData)).rejects.toThrow('NEXT_REDIRECT');
expect(redirect).toHaveBeenCalledWith('/dashboard');
```

**The proxy.** Call `proxy()` with a `NextRequest` and check the redirect `location`, or the headers it passes on (`x-middleware-request-<name>`). See `proxy.test.ts`.

**Route handlers.** Call the exported function with a `NextRequest`:

```ts
const res = GET(new NextRequest('https://app.example.com/api/auth/clear'));
expect(res.status).toBe(307);
```

**Limits.** Vitest can't render async Server Components. Test the logic they call with unit tests and the page with an e2e test.

### Coverage

`npm run test:coverage` fails when coverage of `app/`, `components/`, `lib/`, `services/`, `utils/`, `views/` and `proxy.ts` (pages, layouts and metadata routes excluded, since the e2e tests cover those; and the generated shadcn code in `components/ui/`) drops below 80% of lines, statements and functions, or 75% of branches. CI runs it on every pull request. Raise the numbers in `vitest.config.mts` as coverage grows; don't lower them to make a build pass.

## End-to-end tests

```bash
npx playwright install chromium   # once per machine
npm run build
npm run test:e2e
```

Playwright starts two servers (`playwright.config.ts`) and runs the tests in Chromium:

| Server   | Port | What                                                                     |
| -------- | ---- | ------------------------------------------------------------------------ |
| Mock API | 4010 | `e2e/mock-api.mjs`, a stand-in for your backend                          |
| The app  | 3100 | `next start` with `API_URL` pointing at the mock API: the deployed build |

The app runs on its own port so a `next dev` on 3000 is never mistaken for it. Locally, servers that are already running are reused; set `PORT` to use another app port. On failure in CI, the HTML report is uploaded as the `playwright-report` artifact.

### The mock API

`e2e/mock-api.mjs` answers the requests the e2e tests need, e.g. `POST /api/auth/login` returns a token for the password `correct-password` and a 422 validation error otherwise. When you add a page that calls the API, add its endpoint there with realistic data. The app calls the API from the server, so `page.route()` can't intercept those requests; the mock API can.

### What to test end to end

Use e2e tests for what only works in a real browser and server: navigation, redirects, cookies, headers, whole user flows. Keep logic tests in Vitest, where they are much faster. `e2e/auth.spec.ts` shows the pattern:

```ts
test('a protected page sends a logged-out user to login, and back after logging in', async ({ page }) => {
  await page.goto('/dashboard?tab=reports');
  await expect(page).toHaveURL(/\/login\?redirect=/);

  await page.getByLabel('Email').fill('ada@example.com');
  await page.getByLabel('Password').fill('correct-password');
  await page.getByRole('button', { name: 'Log in' }).click();

  await expect(page).toHaveURL('/dashboard?tab=reports');
});
```

To start a test logged in, add the cookie instead of going through the form:

```ts
await context.addCookies([{ name: '__at', value: 'e2e-token', url: baseURL! }]);
```

Next.js adds an empty `role="alert"` element (its route announcer) to every page, so narrow alert locators by text: `page.getByRole('alert').filter({ hasText: '…' })`.
