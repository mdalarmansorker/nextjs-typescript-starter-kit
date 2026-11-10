# Next.js Starter Kit

A starter for Next.js apps that talk to a separate backend API: TypeScript, Redux Toolkit, Tailwind CSS, a server-side API layer, tests and CI, ready to build on.

## Features

- **Next.js 16** App Router with React 19 and TypeScript in strict mode
- **API layer** that runs every backend call on the server, attaches the access token and handles expired sessions
- **Auth cookie handling** and a session-clearing route, ready for your login page
- **AES-256-GCM encryption** with purpose labels, expiry and key rotation
- **Redux Toolkit** with typed hooks and a per-request store
- **Tailwind CSS 4**
- **Vitest + React Testing Library** for unit and component tests, **Playwright** for end-to-end tests
- **ESLint, Prettier, Stylelint** and **GitHub Actions** CI with Dependabot
- **Security headers**, error page and 404 page
- **Generators** for new feature modules and types

## Getting started

Requires Node.js 22.18 or newer (`.nvmrc` pins 26).

```bash
npm install
cp .env.example .env.local   # then set API_URL and the other values
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

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
| `npm run typecheck`                   | Type-check without building                                     |
| `npm run make:module <name>`          | Create a page, view, API service, type and endpoint constant    |
| `npm run make:type <name>`            | Create a type                                                   |

## Project structure

```
├── app/          # Routes, layouts, error and 404 pages, route handlers
├── views/        # Page UIs (created by make:module)
├── services/     # API layer (services/api) and app services: cookies, cache
├── lib/          # Redux store, hooks, slices, cn()
├── utils/        # Helpers; *.server.ts are server-only
├── constants/    # Endpoint paths, cookie names
├── types/        # Shared types, exported from types/index.ts
├── scripts/      # Code generators
├── e2e/          # Playwright tests
└── docs/         # Documentation
```

Unit tests sit next to the code they test (`helpers.ts` → `helpers.test.ts`).

## Documentation

| Guide                                                  | Covers                                                      |
| ------------------------------------------------------ | ----------------------------------------------------------- |
| [Project structure](docs/project-structure.md)         | Folders, naming, imports, server vs client code             |
| [Environment variables](docs/environment-variables.md) | Every variable, public vs server-only, load order           |
| [API layer](docs/api-layer.md)                         | Calling the backend, options, errors, caching               |
| [Auth cookies and sessions](docs/auth-and-cookies.md)  | Storing tokens, CookieService, logout, post-login redirects |
| [Encryption](docs/encryption.md)                       | Encrypting data, contexts, expiry, key rotation             |
| [State management](docs/state-management.md)           | When to use Redux, adding slices                            |
| [Code generators](docs/code-generators.md)             | `make:module` and `make:type`                               |
| [Testing](docs/testing.md)                             | Unit, component and e2e tests, patterns, coverage           |
| [Code quality and CI](docs/code-quality-and-ci.md)     | Linting, formatting, CI checks, Dependabot                  |
| [Security](docs/security.md)                           | What's built in, what to decide, go-live checklist          |

When you change how something works, update its guide in the same pull request.

## Deployment

Any host that runs Next.js works: Vercel, a Node server (`npm run build && npm start`) or a container. Set the [environment variables](docs/environment-variables.md) on the host and go through the [security checklist](docs/security.md#checklist-before-going-live) first.
