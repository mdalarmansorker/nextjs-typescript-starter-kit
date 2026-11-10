# Next.js Starter Kit

A starter for Next.js apps that talk to a separate backend API: TypeScript, Redux Toolkit, Tailwind CSS with shadcn/ui, a server-side API layer, tests and CI, ready to build on.

## Features

- **Next.js 16** App Router with React 19 and TypeScript in strict mode
- **Server-only API layer** with timeouts, runtime response checks (zod), typed errors and expired-session handling
- **Login, logout and protected routes**: login page and server action, `httpOnly` token cookie, `proxy.ts` route protection, return-to-page after login
- **AES-256-GCM encryption** with purpose labels, expiry and key rotation
- **Redux Toolkit** with typed hooks and a per-request store
- **Tailwind CSS 4** and **shadcn/ui** components (Base UI), with dark mode that follows the system and a toggle
- **Vitest + React Testing Library** for unit and component tests, **Playwright** for end-to-end tests
- **ESLint** (Next.js, React, accessibility rules), **Prettier**, **Stylelint**, and a **pre-commit hook** that runs them on staged files
- **GitHub Actions** CI with a dependency audit, and **Dependabot**
- **Security headers**, error, global-error and 404 pages, server error reporting hook
- **SEO basics**: `robots.txt`, `sitemap.xml`, social preview image
- **Generators** for new feature modules and types

## Getting started

Requires Node.js 22.18 or newer (`.nvmrc` pins 26).

```bash
npm install                  # also installs the pre-commit hook
cp .env.example .env.local   # then set API_URL and the other values
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Logging in needs your backend at `API_URL`; adjust `LoginResponseSchema` in `services/api/auth.service.ts` to your API's login response.

## Scripts

| Script                                | Does                                                            |
| ------------------------------------- | --------------------------------------------------------------- |
| `npm run dev`                         | Start the development server                                    |
| `npm run build`                       | Build for production                                            |
| `npm start`                           | Serve the production build                                      |
| `npm test`                            | Unit and component tests in watch mode                          |
| `npm run test:run`                    | Unit and component tests once                                   |
| `npm run test:coverage`               | Unit and component tests with coverage (fails below thresholds) |
| `npm run test:e2e`                    | Playwright end-to-end tests against the production build        |
| `npm run lint` / `lint:fix`           | Check / fix with ESLint                                         |
| `npm run format` / `format:check`     | Format / check with Prettier                                    |
| `npm run stylelint` / `stylelint:fix` | Check / fix styles                                              |
| `npm run typecheck`                   | Generate route types and type-check without building            |
| `npm run make:module <name>`          | Create a page, view, API service, type and endpoint constant    |
| `npm run make:type <name>`            | Create a type                                                   |

## Project structure

```
├── app/                # Routes, login, error and 404 pages, route handlers, robots/sitemap
├── views/              # Page UIs (login form; make:module adds more)
├── components/         # Shared UI; components/ui holds the shadcn components
├── services/           # API layer (services/api) and app services: cookies, session
├── lib/                # Redux store, hooks, slices, cn()
├── utils/              # Helpers; *.server.ts are server-only
├── constants/          # Endpoint paths, cookie names, protected routes
├── types/              # Shared types, exported from types/index.ts
├── scripts/            # Code generators
├── e2e/                # Playwright tests
├── docs/               # Documentation
├── proxy.ts            # Route protection, runs before every page
└── instrumentation.ts  # Server error reporting
```

Unit tests sit next to the code they test (`helpers.ts` → `helpers.test.ts`).

## Documentation

| Guide                                                  | Covers                                                      |
| ------------------------------------------------------ | ----------------------------------------------------------- |
| [Project structure](docs/project-structure.md)         | Folders, naming, imports, server vs client code             |
| [Environment variables](docs/environment-variables.md) | Every variable, public vs server-only, load order           |
| [API layer](docs/api-layer.md)                         | Calling the backend, options, errors, caching               |
| [Authentication](docs/auth-and-cookies.md)             | Login, logout, protected routes, cookies, redirects         |
| [UI components](docs/ui-components.md)                 | shadcn/ui, adding components, forms, theme, dark mode       |
| [Encryption](docs/encryption.md)                       | Encrypting data, contexts, expiry, key rotation             |
| [State management](docs/state-management.md)           | When to use Redux, adding slices                            |
| [Code generators](docs/code-generators.md)             | `make:module` and `make:type`                               |
| [Testing](docs/testing.md)                             | Unit, component and e2e tests, patterns, coverage           |
| [Code quality and CI](docs/code-quality-and-ci.md)     | Linting, formatting, pre-commit hook, CI checks, Dependabot |
| [Security](docs/security.md)                           | What's built in, what to decide, go-live checklist          |

When you change how something works, update its guide in the same pull request. See [CONTRIBUTING.md](CONTRIBUTING.md) for the workflow and [CHANGELOG.md](CHANGELOG.md) for what changed.

## Deployment

Any host that runs Next.js works: Vercel, a Node server (`npm run build && npm start`) or a container. Set the [environment variables](docs/environment-variables.md) on the host and go through the [security checklist](docs/security.md#checklist-before-going-live) first.

## License

[MIT](LICENSE)
