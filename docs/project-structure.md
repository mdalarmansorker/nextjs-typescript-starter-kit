# Project Structure

Where code goes and the conventions that keep it consistent.

## Folders

| Folder          | Holds                                                                                      |
| --------------- | ------------------------------------------------------------------------------------------ |
| `app/`          | Routes: pages, layouts, `error.tsx`, `not-found.tsx` and route handlers (`app/api/**`)     |
| `views/`        | The UI of a page. `app/<route>/page.tsx` stays thin and renders a view                     |
| `components/`   | Reusable UI shared by several views (create it when you need it)                           |
| `services/api/` | The API layer and one service class per backend resource. See [api-layer.md](api-layer.md) |
| `services/app/` | App-level services that aren't API calls: cookies, cache revalidation                      |
| `lib/`          | Redux store, typed hooks, slices (`lib/features/`) and `cn()`                              |
| `utils/`        | Framework-free helpers. Files ending in `.server.ts` can only be imported on the server    |
| `constants/`    | Endpoint paths (`constants/api/`), cookie names and other fixed values                     |
| `types/`        | Shared TypeScript types, all exported from `types/index.ts`                                |
| `scripts/`      | The `make:module` and `make:type` generators. See [code-generators.md](code-generators.md) |
| `e2e/`          | Playwright end-to-end tests                                                                |
| `docs/`         | This documentation                                                                         |
| `public/`       | Static files served from `/`                                                               |

## Naming

| What                  | Pattern                                     | Example                              |
| --------------------- | ------------------------------------------- | ------------------------------------ |
| Route folder          | kebab-case, plural                          | `app/blog-posts/page.tsx`            |
| View / component      | PascalCase                                  | `views/blog-posts/BlogPosts.tsx`     |
| API service           | `<snake_plural>.service.ts`                 | `services/api/blog_posts.service.ts` |
| Endpoint constants    | `<snake_plural>.api.ts`                     | `constants/api/blog_posts.api.ts`    |
| Types                 | `<snake_plural>.ts`                         | `types/blog_posts.ts`                |
| Server-only module    | `<name>.server.ts` + `import 'server-only'` | `utils/encryption.server.ts`         |
| Unit / component test | next to the file, `.test.ts` / `.test.tsx`  | `utils/helpers.test.ts`              |
| End-to-end test       | `e2e/<feature>.spec.ts`                     | `e2e/home.spec.ts`                   |

`npm run make:module <name>` creates the first five with these names.

Types live in `.ts` files, not `.d.ts`. The project uses `skipLibCheck`, which skips checking every `.d.ts` file, including your own, so a mistake in a `.d.ts` type would never be reported.

## Imports

Use the `@/` alias for anything outside the current folder (`@/utils/helpers`, `@/types`). ESLint sorts imports into groups; `npm run lint:fix` does it for you:

1. Side-effect imports (`import 'server-only'`)
2. React and Next.js
3. Packages
4. `@/utils`, `@/lib`, `@/services`, `@/hooks`, `@/components`, `@/types`, `@/constants`, then other `@/` paths
5. Parent (`../`) and sibling (`./`) imports
6. Styles

## Server and client code

Components are Server Components unless the file starts with `'use client'`. Keep secrets and server-only work out of client bundles:

- Read secrets (`API_URL`, `ENCRYPTION_KEY`) only in server code. Only `NEXT_PUBLIC_` variables reach the browser.
- Add `import 'server-only'` to modules that must never be bundled for the browser. The build fails if a client component imports one.
- Calls to the backend go through `services/api`, which runs on the server even when called from a client component.

## App files

| File                          | Purpose                                                                                          |
| ----------------------------- | ------------------------------------------------------------------------------------------------ |
| `app/layout.tsx`              | Root layout: fonts, metadata (title template from `NEXT_PUBLIC_APP_NAME`) and the Redux provider |
| `app/page.tsx`                | Home page. Replace it                                                                            |
| `app/error.tsx`               | Shown when a page throws. Logs the error and offers "Try again"                                  |
| `app/not-found.tsx`           | 404 page for unknown URLs and `notFound()`                                                       |
| `app/api/auth/clear/route.ts` | Ends a session. See [auth-and-cookies.md](auth-and-cookies.md)                                   |
| `app/globals.css`             | Tailwind import and the theme's color and font variables                                         |
| `next.config.ts`              | Security headers. See [security.md](security.md)                                                 |
