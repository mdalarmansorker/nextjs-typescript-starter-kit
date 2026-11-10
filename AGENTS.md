# AGENTS.md

Instructions for AI coding agents working in this repository. Humans: see [README.md](README.md) and [CONTRIBUTING.md](CONTRIBUTING.md).

This is a Next.js starter kit for apps that talk to a separate backend API (often Laravel). Next.js 16 App Router, React 19, TypeScript (strict), Tailwind CSS 4 with shadcn/ui (Base UI), Redux Toolkit, zod.

## Commands

```bash
npm run dev             # dev server on :3000
npm run lint            # ESLint (lint:fix to fix)
npm run format:check    # Prettier (format to fix)
npm run stylelint       # styles
npm run typecheck       # next typegen + tsc; run after adding or renaming routes
npm run test:run        # Vitest unit and component tests
npm run test:coverage   # same, fails below the coverage thresholds
npm run build           # production build
npm run test:e2e        # Playwright against the production build and a mock API (build first)
```

Run a single test file with `npx vitest run path/to/file.test.ts`.

Before saying a change is done, run lint, format check, typecheck and `test:run`. Run `build` and `test:e2e` when a change touches pages, routing, `proxy.ts`, auth or the API layer.

## Where code goes

| Path               | Holds                                                                     |
| ------------------ | ------------------------------------------------------------------------- |
| `app/`             | Routes only. `page.tsx` stays thin and renders a view                     |
| `components/ui/`   | shadcn components, added with the shadcn CLI                              |
| `components/`      | Shared UI used by several views                                           |
| `views/<feature>/` | The UI of a page                                                          |
| `services/api/`    | Server-only API layer: `handleRequest` and one service class per resource |
| `services/app/`    | Cookies (`CookieService`) and the login session                           |
| `constants/`       | Endpoint paths (`constants/api/`), cookie names, protected routes         |
| `lib/`             | Redux store, typed hooks, slices, `cn()`                                  |
| `utils/`           | Framework-free helpers; `*.server.ts` files are server-only               |
| `types/`           | Shared types, re-exported from `types/index.ts`                           |
| `proxy.ts`         | Route protection (Next.js 16 replaced `middleware.ts` with `proxy.ts`)    |
| `docs/`            | One guide per area. Read the relevant one before changing that area       |

Scaffold a new feature with `npm run make:module <name>` (page, view, service, type, endpoint constant) instead of creating the files by hand.

## Rules

### API layer

- Every backend call goes through `handleRequest` in `services/api/base.service.ts`. Never `fetch` the API directly.
- The API layer imports `server-only`. Read data in Server Components; change data in server actions. Don't use server actions for reads, and never import `services/api` into a client component.
- Pass `parse` with a zod schema so responses are checked at runtime.
- `handleRequest` throws `ApiError` (`status`, `message`, `errors`). In server actions, catch it and **return** `{ message, fieldErrors }` for 4xx; rethrow or log 5xx. Messages of errors thrown from server actions are hidden in production.
- Encode user input in paths: `` `${PROJECTS}/${encodeURIComponent(id)}` ``.
- `redirect()` and `notFound()` work by throwing. Call them outside `try`, or use `unstable_rethrow`.

### Auth and security

- Add protected sections to `PROTECTED_ROUTES` in `constants/routes.ts`. The proxy only checks that a token cookie exists; the API must still authorize every request.
- Add auth cookies to `COOKIE_NAMES` in `constants/cookie.ts` so logout deletes them.
- Redirect targets from URLs or forms must pass `isSafeRedirectPath` (`utils/redirect-path.ts`).
- Never expose `API_URL`, tokens or `ENCRYPTION_KEY` to the browser. Only `NEXT_PUBLIC_*` variables reach client code.

### UI

- Use the shadcn components in `components/ui/` before writing your own. Add missing ones with `npx shadcn@latest add <name>`, not by hand, then run `npm run lint:fix && npm run format`. `docs/ui-components.md` has the details.
- The components are built on Base UI (`@base-ui/react`), not Radix. Examples written for Radix (`asChild`, `@radix-ui/*` imports) don't apply.
- Style a `Link` as a button with `buttonVariants()`, so it stays a link.
- Use theme color classes (`bg-background`, `text-muted-foreground`, `text-destructive`, `border-border`), not fixed palette colors like `text-zinc-600`, so light and dark mode both work.
- Dark mode is the `dark` class set by `next-themes`. In client components read it with `useTheme().resolvedTheme`.
- Merge class names with `cn()` from `@/lib/utils`.
- Forms: `Field`, `FieldLabel`, `Input`, `FieldError`, wired with `htmlFor`, `aria-invalid` and `aria-describedby`, as in `views/login/LoginForm.tsx`.

### Code style

- TypeScript strict with `noUncheckedIndexedAccess`: index access returns `T | undefined`, so handle it.
- Imports use the `@/` alias. Import order is enforced by ESLint (`simple-import-sort`); run `npm run lint:fix` rather than ordering by hand.
- Single quotes, formatted by Prettier. Don't hand-format.
- Components and views are PascalCase files; other files are kebab-case or camelCase as in neighboring code.
- Follow the patterns in nearby files before adding new abstractions or dependencies.

### Tests

- Unit tests sit next to the code: `thing.ts` → `thing.test.ts` (node), `Thing.tsx` → `Thing.test.tsx` (jsdom).
- Query by role and label (`getByRole`, `getByLabelText`), not by class or test ID.
- Mock the layer below: test a server action by mocking its service, a service by mocking `handleRequest`.
- E2E tests use the mock API in `e2e/mock-api.mjs`; add endpoints there when a flow needs them.
- Don't lower the coverage thresholds in `vitest.config.mts` to make a run pass.

### Documentation

Every change that affects behavior, setup or conventions updates the matching guide in `docs/` in the same change, and adds a line to `CHANGELOG.md` under "Unreleased".

### Git

- Conventional Commits: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`.
- A pre-commit hook runs ESLint, Prettier and Stylelint on staged files. Don't bypass it with `--no-verify`.
- Don't commit `.env*` files other than `.env.example`.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
