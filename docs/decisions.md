# Decisions

Why the kit is built the way it is. Read the entries for the area you are changing first: a change that goes against an accepted decision needs a new decision, not a quiet workaround.

[architecture.md](architecture.md) shows how the parts fit together; this file records why.

## How to use this log

- **Before changing an area**, read its decisions. If the change goes against one, raise it first.
- **Add a decision** when a change sets a direction others must follow: a new dependency, a new pattern, or a change to how the API layer, auth, routing, state or project structure work. Routine features, fixes and refactors that follow the existing decisions don't need one.
- **Don't edit an accepted decision** to mean something else. Add a new one that supersedes it, and set the old one's status to `Superseded by D-0xx`. Fixing a typo or a broken link is fine.
- **Number entries in order** (`D-001`, `D-002`, …) and never reuse a number. Add new entries at the end.
- Link the decision from the guide in `docs/` it affects, and add a line to `CHANGELOG.md`.

Entries marked **Baseline** describe choices made before this log was started (v2.0).

### Template

```md
## D-0xx: Short title in the present tense

- **Status:** Proposed | Accepted | Superseded by D-0xx
- **Date:** YYYY-MM-DD
- **Area:** API layer | Auth | Routing | Components | State | Tests | Tooling

**Context.** The problem, and the constraints that matter.

**Decision.** What we do, stated as a rule someone can follow.

**Consequences.** What gets easier, what gets harder, what is now off-limits. Alternatives that were rejected, and why.
```

---

## D-001: Only the Next.js server calls the API

- **Status:** Accepted (Baseline)
- **Area:** API layer

**Context.** The backend is a separate REST API that needs an access token. Calling it from the browser would expose `API_URL` and the token to page scripts, and spread auth, timeouts and error handling across components.

**Decision.** Every API call goes through `handleRequest` in `services/api/base.service.ts`, which imports `server-only`. Client components never import `services/api`; they get data as props or change it through server actions.

**Consequences.** Secrets stay on the server, and auth, timeouts, error mapping and token refresh live in one place. Data the browser must fetch itself (polling) needs a route handler. Client-side data libraries such as React Query or SWR calling the API directly are off-limits.

## D-002: Tokens are stored in `httpOnly` cookies

- **Status:** Accepted (Baseline)
- **Area:** Auth

**Context.** The app needs the access and refresh tokens on every server request. `localStorage` or readable cookies can be stolen by any injected script.

**Decision.** `saveSession` stores the tokens in `httpOnly`, `sameSite: 'lax'` cookies (`secure` outside development). Every auth cookie is listed in `COOKIE_NAMES` so logout deletes it.

**Consequences.** Page scripts can't read the tokens. Cookies can only be set in server actions and route handlers, not while a Server Component renders, which is why token refresh needs the routes in D-006.

## D-003: Read in Server Components, write in server actions

- **Status:** Accepted (Baseline)
- **Area:** API layer

**Context.** Next.js offers several places to call the backend. The browser runs server actions one at a time, and their results can't be cached.

**Decision.** Pages read data in Server Components. Forms and buttons change data through server actions, which return 4xx errors as `{ message, fieldErrors }` to a `useActionState` form and rethrow or log 5xx.

**Consequences.** Reads run in parallel and can be cached; forms can show the API's validation errors. Server actions are never used for reads.

## D-004: API responses are checked at runtime with zod

- **Status:** Accepted (Baseline)
- **Area:** API layer

**Context.** A TypeScript type on a response is only a promise. When the API changes shape, the app breaks somewhere unrelated to the call.

**Decision.** Services pass `parse` with a zod schema to `handleRequest`. Paginated lists use `parsePage`.

**Consequences.** A wrong shape fails at the call with `ApiError` 502 and the details in the server log. Each service keeps a schema next to its type.

## D-005: The proxy only checks that a token cookie exists

- **Status:** Accepted (Baseline)
- **Area:** Auth, Routing

**Context.** `proxy.ts` runs before every page request. Validating the token there would mean an API call per request, and the API checks the token anyway.

**Decision.** The proxy treats a user as logged in when an access-token or refresh-token cookie exists. It redirects for `PROTECTED_ROUTES` and `GUEST_ONLY_ROUTES`, starts a refresh when only the refresh token is left, and sets `x-current-path`. The API authorizes every request.

**Consequences.** Page loads stay fast. A revoked token is noticed on the first API call (a 401). Permissions must be checked by the API, and by pages or layouts where they decide what to show, never by the proxy alone.

## D-006: Tokens are refreshed in three places

- **Status:** Accepted (Baseline)
- **Area:** Auth

**Context.** Many APIs issue short-lived access tokens with refresh tokens, often rotating them. Server Components can't set cookies.

**Decision.** The proxy sends a page load with an expired access cookie through `/api/auth/refresh`. `handleRequest` refreshes and retries once after a 401 in server actions and route handlers, and redirects to `/api/auth/refresh` while a Server Component renders. Parallel refreshes with the same refresh token share one API call. `AUTH_REFRESH = null` turns it off.

**Consequences.** Users stay logged in without client code. APIs without refresh tokens need no changes. The request format lives in `sendRefresh` (`services/api/auth-tokens.ts`).

## D-007: One function reads every API error body

- **Status:** Accepted (Baseline)
- **Area:** API layer

**Context.** The kit works with any backend, and backends shape error bodies differently (Laravel, Django REST Framework, FastAPI, Express, RFC 9457).

**Decision.** `readApiError` in `services/api/api-errors.ts` turns every error body into `ApiError` with `message` and `fieldErrors` (`{ field: ['message'] }`). Callers never read error bodies themselves.

**Consequences.** Supporting a new backend means changing one function. Forms render field errors the same way for every API.

## D-008: Redux holds UI state only

- **Status:** Accepted (Baseline)
- **Area:** State

**Context.** Copying API data into a client store means fetching it twice and keeping two caches in sync.

**Decision.** Redux Toolkit is for UI state shared by several client components. Server data is read in Server Components (D-003); state of one component uses `useState`; filters, tabs and pagination go in the URL. The store is created per request in `StoreProvider`.

**Consequences.** One source of truth for API data. No user's state leaks into another's server render.

## D-009: Views mirror routes, one component per file

- **Status:** Accepted (Baseline)
- **Area:** Components

**Context.** Pages that hold their whole UI grow hard to read, and helper components defined next to the main one are hard to find and reuse.

**Decision.** `app/<route>/page.tsx` stays thin and renders `views/<route>/index.tsx`, with `sections/` and view-only `components/`. UI used by more than one view goes in the root `components/`. Each file holds one component, except shadcn-style primitive families. Details in [project-structure.md](project-structure.md#components-and-views).

**Consequences.** The UI for a URL is always in the same place. A view never imports another view's internals.

## D-010: Tests run against a mock API

- **Status:** Accepted (Baseline)
- **Area:** Tests

**Context.** The kit has no backend of its own, and tests must run in CI without one.

**Decision.** Vitest runs unit and component tests, mocking the layer below the code under test. Playwright runs e2e tests against the production build and `e2e/mock-api.mjs`. Coverage thresholds in `vitest.config.mts` are not lowered to make a run pass.

**Consequences.** Tests are fast and need no backend. When a flow needs an endpoint, it is added to the mock API, which must stay close to the real API's shapes.

## D-011: The app starts without an API

- **Status:** Accepted
- **Date:** 2026-11-21
- **Area:** Tooling

**Context.** The startup check (`utils/validate-env.ts`) used to stop the server when `API_URL` was not set. Teams often design, build and deploy the UI before the backend exists, and a server that won't start blocks that work.

**Decision.** `API_URL` is optional at startup. When it is unset or blank, `assertValidEnv` logs a warning (from `envWarnings`) and the server starts. A malformed `API_URL` still stops the server. Requests made without it fail with "API_URL is not set", so pages that call the API show `app/error.tsx`.

**Consequences.** Pages that don't call the API work and can be deployed without a backend. A deployment that forgets `API_URL` is noticed by the warning in the logs and the first failing API page, not by a server that refuses to start. Other variables that the app can run without but lose a feature should follow the same pattern: optional in `EnvSchema`, a message in `envWarnings`.

## D-012: Production builds remove all console output

- **Status:** Accepted
- **Date:** 2026-11-21
- **Area:** Tooling

**Context.** Output left in code clutters the browser console and server logs in production and can expose data such as API responses or tokens.

**Decision.** `next.config.ts` sets `compiler.removeConsole` to `true` when `NODE_ENV` is `production`. Every `console.*` call in app code, including `console.error` and `console.warn`, is removed from production builds, on the server and in the browser. Development and tests keep all of them.

**Consequences.** Nothing from app code reaches the console in production. Server errors, including the log line in `onRequestError` (`instrumentation.ts`), are not logged until an error tracker is connected there; its SDK is in `node_modules`, which is not stripped. The startup warning for a missing `API_URL` (D-011) is not shown in production. `{ exclude: ['error', 'warn'] }` was considered, which keeps the server's error logs; switching to it needs a new decision that supersedes this one.
