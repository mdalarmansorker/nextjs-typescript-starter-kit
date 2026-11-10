# Authentication and Sessions

How users log in and out, how pages are protected, how tokens are stored and refreshed.

## Overview

| Piece                            | File                                              |
| -------------------------------- | ------------------------------------------------- |
| Login page and form              | `app/login/page.tsx`, `views/login/LoginForm.tsx` |
| Login server action              | `app/login/actions.ts`                            |
| Login request and response check | `services/api/auth.service.ts`                    |
| Token response shapes, refresh   | `services/api/auth-tokens.ts`                     |
| Storing and refreshing tokens    | `services/app/session.service.ts`                 |
| Refresh before a page renders    | `app/api/auth/refresh/route.ts`                   |
| Page protection                  | `proxy.ts`, `constants/routes.ts`                 |
| Logout and expired sessions      | `app/api/auth/clear/route.ts`                     |
| Return-to-page after login       | `utils/redirect-path.ts`                          |
| Example protected page           | `app/dashboard/page.tsx`                          |

## Logging in

1. The user submits `/login`. `app/login/actions.ts` checks the form with zod, then calls `AuthService.login`, which posts to `AUTH_LOGIN` (`/auth/login`).
2. The response is checked against `TokenResponseSchema` in `services/api/auth-tokens.ts`, which accepts the common names: `token`, `access_token`, `accessToken` or `access` for the access token; `refresh_token`, `refreshToken` or `refresh` for the refresh token; `expires_in` or `expiresIn` for its lifetime in seconds. **If your API sends something else** (e.g. tokens nested under `data`), change the schema.
3. `saveSession(session)` stores the access token in the `__at` cookie (`httpOnly`, `secure` outside development, `sameSite: 'lax'`). The cookie expires 30 seconds before the token when the API sends `expires_in`, else after 15 days. A refresh token goes in the `__rt` cookie for 15 days.
4. The user is sent to the page in `?redirect=`, or to `AFTER_LOGIN_ROUTE` (`/dashboard`).

Errors the API returns for the login (4xx) are shown on the form with their field errors. Server-side failures (API down, timeout) show a generic message and are logged.

## Protecting pages

`constants/routes.ts` lists the routes:

| Constant            | Default          | Meaning                                                       |
| ------------------- | ---------------- | ------------------------------------------------------------- |
| `PROTECTED_ROUTES`  | `['/dashboard']` | Need login. `/dashboard` also covers `/dashboard/settings`    |
| `GUEST_ONLY_ROUTES` | `['/login']`     | Logged-in users are sent on to `AFTER_LOGIN_ROUTE`            |
| `LOGIN_ROUTE`       | `/login`         | Where logged-out users are sent                               |
| `AFTER_LOGIN_ROUTE` | `/dashboard`     | Where users go after login when there is no page to return to |

`proxy.ts` runs before every page request. A logged-out user opening a protected page goes to `/login?redirect=<page>`; after login they come back to it.

"Logged in" in the proxy means **an access-token or refresh-token cookie exists**. Whether a token is still valid only the API knows: a rejected token gets a 401 on the first API call, which refreshes it or ends the session (see below). Never rely on the proxy alone for authorization: every API endpoint must check the token itself.

## Logging out

Use a form that POSTs to `/api/auth/clear` (see `app/dashboard/page.tsx`):

```tsx
<form method="post" action="/api/auth/clear">
  <button type="submit">Log out</button>
</form>
```

The POST first calls `AuthService.logout()`, which sends `POST AUTH_LOGOUT` (`/auth/logout` in `constants/api/auth.api.ts`) with the token so the API can revoke it. A token copied before logout then stops working too. Then the route deletes every cookie in `COOKIE_NAMES` and redirects to `/`.

- Logout never depends on the API: if the call fails or times out (5 seconds), the error is logged and the cookies are still deleted.
- A 401 from the logout endpoint doesn't redirect: the token may already have been invalid.
- Change `AUTH_LOGOUT` to your API's path, or set it to `null` if your API has no logout endpoint (for example, stateless JWTs that only expire).

## Expired sessions

When an API request with `requiresAuth` gets a 401 and there is no refresh token (or refreshing fails), `handleRequest` ends the session. In a server action or route handler it deletes the auth cookies itself and redirects to `/login?redirect=<current page>`. While a Server Component renders, cookies are read-only, so it redirects to `GET /api/auth/clear?redirect=<current page>`, which deletes them and redirects to `/login?redirect=…`.

`/api/auth/clear` ignores requests started by another site (`Sec-Fetch-Site: cross-site` or `same-site`): it redirects without deleting anything, so another site can't log your users out by embedding the URL in an image or form.

## Token refresh

Used when the login response includes a refresh token. APIs without refresh tokens (e.g. Laravel Sanctum) need no changes: no `__rt` cookie is ever stored, so none of this runs. Set `AUTH_REFRESH` to `null` in `constants/api/auth.api.ts` to turn it off completely.

Next.js only lets server actions and route handlers set cookies, not Server Components, so the refresh happens in one of three places:

| When                                                    | Where                                                                                                   |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| A page loads after the access cookie expired            | `proxy.ts` sends the GET to `/api/auth/refresh?redirect=<page>`, which stores new tokens and comes back |
| The API returns 401 in a server action or route handler | `handleRequest` refreshes, stores the new tokens and retries the request once                           |
| The API returns 401 while a Server Component renders    | `handleRequest` redirects to `/api/auth/refresh?redirect=<page>`                                        |

The first case covers most expiries before any API call is made, because the access cookie expires 30 seconds before the token. The other two catch tokens that the API rejects early (revoked, or no `expires_in` sent).

**Client-side navigations.** Next.js's client router can't follow a redirect into a route handler and back to the same page: it keeps re-navigating without rendering. So `/api/auth/refresh` and `/api/auth/clear` answer a client-router request (`rsc` header or `_rsc` parameter) with an empty 204. The router then loads the URL as a full page, and the redirects run as in a normal page load.

If the API rejects the refresh token (4xx), the session ends and the user goes to login, keeping the page to return to. If the API can't be reached (5xx, timeout), the error is shown instead, so an outage doesn't log everyone out. A second 401 right after a successful refresh ends the session instead of looping.

**The refresh request** is `POST AUTH_REFRESH` (`/auth/refresh`) with `{ "refresh_token": "…" }`, built in `sendRefresh` in `services/api/auth-tokens.ts`. Change it there if your API expects another body (Django SimpleJWT: `{ refresh }`; OAuth 2: form-encoded `grant_type=refresh_token`) or the token in a header. The response goes through `TokenResponseSchema`, like the login response. A response without a new refresh token keeps the old one.

**Rotating refresh tokens.** Many APIs issue a new refresh token on every refresh and reject the old one. When several requests need a refresh at once (parallel requests, several tabs), they share one API call: results are reused for 10 seconds per refresh token. This sharing is per server process; with several instances, give the API a short grace period for the previous refresh token.

**Logout** sends the refresh token in the body of the logout request, so the API can revoke it too.

## Returning to the page after login

The page is carried in `?redirect=` as a Base64URL token made by `encodeRedirectPath` (`utils/redirect-path.ts`). This only keeps the URL tidy; it isn't secret, and anyone can create a value.

What makes it safe: `encodeRedirectPath` and `decodeRedirectPath` only accept paths on this site (`/reports?y=2026`), never `https://…`, `//host` or `/\host`. A crafted link can't send users to another site after login. For any other redirect target that comes from a URL or form, check it with `isSafeRedirectPath`.

## Auth cookies

`constants/cookie.ts`:

| Constant                     | Value   | Use                                                                                                     |
| ---------------------------- | ------- | ------------------------------------------------------------------------------------------------------- |
| `COOKIE_NAMES.ACCESS_TOKEN`  | `__at`  | Token sent to the API as `Bearer`                                                                       |
| `COOKIE_NAMES.REFRESH_TOKEN` | `__rt`  | Refresh token, if your API issues one                                                                   |
| `COOKIE_NAMES.PERMISSIONS`   | `__prm` | Cached permissions, if you need them                                                                    |
| `AUTH_COOKIES_DURATION_DAYS` | `15`    | Lifetime of the refresh-token cookie, and of the access-token cookie when the API sends no `expires_in` |
| `COOKIE_SECURE`              | bool    | `true` everywhere except `next dev`                                                                     |

Every name in `COOKIE_NAMES` is deleted at logout, so add new auth cookies there. Don't use `__ts`: it is reserved for theme settings.

## CookieService

`services/app/cookie.service.ts` is one cookie API for server and browser. On the server it uses `cookies()` from `next/headers`; in the browser, `js-cookie`.

| Method                                        | Description                                         |
| --------------------------------------------- | --------------------------------------------------- |
| `CookieService.store(name, value, options?)`  | Set a cookie                                        |
| `CookieService.get(name)`                     | Read a cookie                                       |
| `CookieService.update(name, value, options?)` | Overwrite a cookie                                  |
| `CookieService.delete(name, options?)`        | Delete a cookie                                     |
| `CookieService.clear(names?, options?)`       | Delete the given cookies; by default `COOKIE_NAMES` |

All of them are `async`. `options` use the `js-cookie` shape: `expires` in days or a `Date`, `path`, `domain`, `secure`, `sameSite`, and `httpOnly` (server only). On the server they are converted to what Next.js expects (`expires: 15` becomes `maxAge: 1296000`).

`clear()` only deletes cookies it is given, never every cookie, so consent, analytics and theme cookies survive a logout.

`storeSync`, `getSync`, `deleteSync` and `clearSync` are browser-only shortcuts and throw on the server.

On the server, cookies can only be written in a server action or route handler, not while a Server Component renders. In the browser, `httpOnly` cookies such as the access token are invisible: `get` returns `undefined` and `delete` can't remove them.

## To build yourself

- **Registration, password reset, email verification**: add endpoints to `constants/api/auth.api.ts`, methods to `AuthService`, and pages like `/login`.
- **Permissions**: protect pages by role in the page or layout (`notFound()` or `redirect()`), not only in the proxy.
