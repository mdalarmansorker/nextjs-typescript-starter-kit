# Auth Cookies and Sessions

How the access token is stored, how a session ends, and how the user gets back to where they were.

The starter has no login page or login flow: those depend on your backend. It gives you the pieces they need.

## Auth cookies

`constants/cookie.ts` defines the cookie names and lifetime:

| Constant                     | Value   | Use                                   |
| ---------------------------- | ------- | ------------------------------------- |
| `COOKIE_NAMES.ACCESS_TOKEN`  | `__at`  | Token sent to the API as `Bearer`     |
| `COOKIE_NAMES.REFRESH_TOKEN` | `__rt`  | Refresh token, if your API issues one |
| `COOKIE_NAMES.PERMISSIONS`   | `__prm` | Cached permissions, if you need them  |
| `AUTH_COOKIES_DURATION_DAYS` | `15`    | Lifetime in days                      |
| `COOKIE_SECURE`              | bool    | `true` everywhere except `next dev`   |

Every name in `COOKIE_NAMES` is deleted when a session ends, so add new auth cookies there.

## Storing the token after login

Set auth cookies in a server action or route handler, `httpOnly` so page scripts can't read them:

```ts
'use server';

import CookieService from '@/services/app/cookie.service';

import { AUTH_COOKIES_DURATION_DAYS, COOKIE_NAMES, COOKIE_SECURE } from '@/constants/cookie';

export async function saveSession(token: string) {
  await CookieService.store(COOKIE_NAMES.ACCESS_TOKEN, token, {
    expires: AUTH_COOKIES_DURATION_DAYS,
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: 'lax',
    path: '/',
  });
}
```

Cookies can only be written on the server in a server action or route handler, not while rendering a Server Component.

## CookieService

`services/app/cookie.service.ts` is one cookie API for server and browser. On the server it uses `cookies()` from `next/headers`; in the browser it uses `js-cookie`.

| Method                                        | Description                  |
| --------------------------------------------- | ---------------------------- |
| `CookieService.store(name, value, options?)`  | Set a cookie                 |
| `CookieService.get(name)`                     | Read a cookie                |
| `CookieService.update(name, value, options?)` | Overwrite a cookie           |
| `CookieService.delete(name, options?)`        | Delete a cookie              |
| `CookieService.clear()`                       | Delete every readable cookie |

All of them are `async`. `options` use the `js-cookie` shape: `expires` in days or a `Date`, `path`, `domain`, `secure`, `sameSite`, and `httpOnly` (server only). On the server they are converted to what Next.js expects (`expires: 15` becomes `maxAge: 1296000`).

`storeSync`, `getSync`, `deleteSync` and `clearSync` are browser-only shortcuts and throw on the server.

In the browser, `httpOnly` cookies such as the access token are invisible: `get` returns `undefined` and `clear` can't remove them. Use `/api/auth/clear` to end a session.

## Ending a session

`GET /api/auth/clear` deletes every cookie in `COOKIE_NAMES` and redirects:

- to `/login?redirect=<value>` when called with `?redirect=<value>`
- to `/` otherwise

It runs automatically when an authenticated API request returns 401 (see [api-layer.md](api-layer.md#expired-sessions)). For a logout button, link to it:

```tsx
<a href="/api/auth/clear">Log out</a>
```

Use a plain `<a>`, not `<Link>`, so the browser makes a full request.

## Returning the user after login

When a session expires in the browser, the current path is passed to `/login` in the `redirect` parameter, obfuscated with `utils/redirect-encryption.ts` so it isn't readable in the address bar. On your login page, read it back once login succeeds:

```ts
import { redirect } from 'next/navigation';

import { decryptRedirectUrl } from '@/utils/redirect-encryption';

redirect((redirectParam && decryptRedirectUrl(redirectParam)) || '/');
```

`decryptRedirectUrl` only returns paths on this site (`/dashboard`), never `https://…` or `//host`. The obfuscation key is public, so anyone can create a value; this check is what stops a crafted link from sending users to another site after they log in. If you take a redirect target from anywhere else, check it with `isSafeRedirectPath` from the same file.

## To build yourself

- **A `/login` page.** Expired sessions redirect there.
- **Route protection.** Nothing stops a logged-out user from opening a page; the first authenticated API call sends them to login. To redirect earlier, check for the `__at` cookie in `proxy.ts` (Next.js 16's middleware) or in a layout.
- **Token refresh**, if your API uses refresh tokens.
