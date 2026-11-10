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

**Route handlers.** Call the exported function with a `NextRequest`:

```ts
const res = GET(new NextRequest('https://app.example.com/api/auth/clear'));
expect(res.status).toBe(307);
```

**Limits.** Vitest can't render async Server Components. Test the logic they call with unit tests and the page with an e2e test.

### Coverage

`npm run test:coverage` fails when coverage of `app/`, `lib/`, `services/` and `utils/` drops below 80% of lines, statements and functions, or 75% of branches. CI runs it on every pull request. Raise the numbers in `vitest.config.mts` as coverage grows; don't lower them to make a build pass.

## End-to-end tests

```bash
npx playwright install chromium   # once per machine
npm run build
npm run test:e2e
```

The tests run in Chromium against `next start`, the same build that gets deployed. Locally, a server already running on port 3000 is reused; set `PORT` to use another one. On failure in CI, the HTML report is uploaded as the `playwright-report` artifact.

Use e2e tests for what only works in a real browser and server: navigation, redirects, cookies, headers, full pages. Keep logic tests in Vitest, where they are much faster.

```ts
test('unknown pages show the not-found page with a 404', async ({ page }) => {
  const response = await page.goto('/this-page-does-not-exist');

  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
});
```

Pages that call the API need a backend. Either point `API_URL` at a test backend, or mock responses in the browser with `page.route()` for calls made from the browser.
