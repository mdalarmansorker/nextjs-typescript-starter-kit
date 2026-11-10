# Changelog

Notable changes to the starter kit. The format follows [Keep a Changelog](https://keepachangelog.com/), and versions follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Login page and server action, `httpOnly` session cookie, and route protection in `proxy.ts` (`constants/routes.ts`). An example protected page at `/dashboard`.
- After an expired session, users return to the page they were on once they log in again.
- `parse` option on `handleRequest` to check API responses at runtime; zod is included.
- `timeoutMs` option on API requests, defaulting to 10 seconds (`API_TIMEOUT_MS`).
- `app/global-error.tsx`, `instrumentation.ts` (server error reporting hook), `robots.txt`, `sitemap.xml` and a social preview image.
- Unit and component tests (Vitest, React Testing Library), end-to-end tests (Playwright) with a mock backend, and coverage thresholds.
- Pre-commit hook (husky, lint-staged), `npm audit` in CI, Dependabot.
- Security headers, error and 404 pages.
- `AGENTS.md` with project rules for AI coding agents, plus Next.js's managed docs block; `CLAUDE.md` imports it.
- `LICENSE` (MIT), `CONTRIBUTING.md`, pull request template, and guides for every area in `docs/`.
- Environment variables are checked when the server starts (`utils/validate-env.ts`, called from `register()` in `instrumentation.ts`); a missing `API_URL` or malformed key stops the server with a list of problems.
- Logout revokes the token on the API (`AuthService.logout`, `AUTH_LOGOUT`) before deleting the cookies. Set `AUTH_LOGOUT` to `null` if your API has no logout endpoint.
- `query` option on `handleRequest` for encoded query parameters.
- `endSessionOn401` option on `handleRequest`, to get the `ApiError` instead of ending the session.
- `ApiError.fieldErrors`: field errors as `{ field: ['message'] }` from the common API formats (Laravel, FastAPI, express-validator, zod, JSON:API).

### Changed

- **Breaking:** the API layer is server-only. `executeServerRequest` is no longer a server action; client components call your own server actions, which call the services.
- **Breaking:** `handleRequest` always throws `ApiError` (with `status`, `message`, `errors`). The third `mode` argument is removed: catch `ApiError` instead of using `'raw'`.
- **Breaking:** `utils/redirect-encryption.ts` is replaced by `utils/redirect-path.ts` (`encodeRedirectPath`, `decodeRedirectPath`), without `crypto-js`.
- **Breaking:** `CookieService.clear()` deletes only the auth cookies (or the names you pass), not every cookie.
- **Breaking:** types live in `types/*.ts` instead of `.d.ts`, so type errors in them are reported.
- ESLint uses `eslint-config-next` (React, accessibility and Core Web Vitals rules); `react-hooks/exhaustive-deps` is on.
- TypeScript checks with `noUncheckedIndexedAccess` and `noFallthroughCasesInSwitch`; `typecheck` generates route types first.
- `/api/auth/clear` accepts POST for logout forms and ignores requests started by other sites.
- API error bodies are read by `readApiError` (`services/api/api-errors.ts`), which understands `{ message }`, `{ error }`, `{ detail }` and RFC 9457 problem details, not only `{ message, errors }`.
- Code generators run on Node's built-in TypeScript support, refuse to overwrite files, and generate server-only services.
- Prettier formats every file type; GitHub Actions are pinned to commit SHAs.
- Requires Node.js 22.18 or newer.

### Fixed

- API slugs can no longer escape `API_URL` (`/../admin`, `@other-host`).
- Post-login redirects only go to paths on this site.
- The unused `revalidate` server action, which let anyone clear any cache tag, is removed.
- `.env.example` no longer sets `NODE_ENV` or uses unsupported `{{VAR}}` syntax.
- The Geist font is applied (it was overridden by Arial); page titles use `NEXT_PUBLIC_APP_NAME`.
- The pluralizer in the generators (`key` → `keys`, not `kies`).

### Removed

- `crypto-js`, `ts-node`, `fs-extra`, `services/app/cache.service.ts`.

## [1.0.3] and earlier

Not recorded.
