# Authentication and Sessions

How users log in and out, how pages are protected, and how the access token is stored.

## Overview

| Piece                            | File                                              |
| -------------------------------- | ------------------------------------------------- |
| Login page and form              | `app/login/page.tsx`, `views/login/LoginForm.tsx` |
| Login server action              | `app/login/actions.ts`                            |
| Login request and response check | `services/api/auth.service.ts`                    |
| Storing the token                | `services/app/session.service.ts`                 |
| Page protection                  | `proxy.ts`, `constants/routes.ts`                 |
| Logout and expired sessions      | `app/api/auth/clear/route.ts`                     |
| Return-to-page after login       | `utils/redirect-path.ts`                          |
| Example protected page           | `app/dashboard/page.tsx`                          |

## Logging in

1. The user submits `/login`. `app/login/actions.ts` checks the form with zod, then calls `AuthService.login`, which posts to `AUTH_LOGIN` (`/auth/login`).
2. The response is checked against `LoginResponseSchema` in `services/api/auth.service.ts`. **Change this schema to match your API.** It expects `{ token: string }` (Laravel Sanctum's shape).
3. `saveSession(token)` stores the token in the `__at` cookie: `httpOnly`, `secure` outside development, `sameSite: 'lax'`, for 15 days.
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

"Logged in" in the proxy means **the token cookie exists**. Whether the token is still valid only the API knows: an expired token gets a 401 on the first API call, which ends the session (see below). Never rely on the proxy alone for authorization: every API endpoint must check the token itself.

## Logging out

Use a form that POSTs to `/api/auth/clear` (see `app/dashboard/page.tsx`):

```tsx
<form method="post" action="/api/auth/clear">
  <button type="submit">Log out</button>
</form>
```

The route deletes every cookie in `COOKIE_NAMES` and redirects to `/`. If your API keeps server-side sessions, also call its logout endpoint from a server action first.

## Expired sessions

When an API request with `requiresAuth` gets a 401, `handleRequest` redirects to `GET /api/auth/clear?redirect=<current page>`, which deletes the auth cookies and redirects to `/login?redirect=…`.

`/api/auth/clear` ignores requests started by another site (`Sec-Fetch-Site: cross-site` or `same-site`): it redirects without deleting anything, so another site can't log your users out by embedding the URL in an image or form.

## Returning to the page after login

The page is carried in `?redirect=` as a Base64URL token made by `encodeRedirectPath` (`utils/redirect-path.ts`). This only keeps the URL tidy; it isn't secret, and anyone can create a value.

What makes it safe: `encodeRedirectPath` and `decodeRedirectPath` only accept paths on this site (`/reports?y=2026`), never `https://…`, `//host` or `/\host`. A crafted link can't send users to another site after login. For any other redirect target that comes from a URL or form, check it with `isSafeRedirectPath`.

## Auth cookies

`constants/cookie.ts`:

| Constant                     | Value   | Use                                   |
| ---------------------------- | ------- | ------------------------------------- |
| `COOKIE_NAMES.ACCESS_TOKEN`  | `__at`  | Token sent to the API as `Bearer`     |
| `COOKIE_NAMES.REFRESH_TOKEN` | `__rt`  | Refresh token, if your API issues one |
| `COOKIE_NAMES.PERMISSIONS`   | `__prm` | Cached permissions, if you need them  |
| `AUTH_COOKIES_DURATION_DAYS` | `15`    | Lifetime in days                      |
| `COOKIE_SECURE`              | bool    | `true` everywhere except `next dev`   |

Every name in `COOKIE_NAMES` is deleted at logout, so add new auth cookies there.

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
- **Token refresh**, if your API uses refresh tokens: on a 401, call the refresh endpoint and retry before ending the session.
- **Permissions**: protect pages by role in the page or layout (`notFound()` or `redirect()`), not only in the proxy.
