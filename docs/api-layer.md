# API Layer

How this project talks to the backend API. Every request goes through `handleRequest` in `services/api/base.service.ts`; don't call `fetch` against the API directly.

## Request flow

```
Domain service (e.g. services/api/blog_posts.service.ts)
  └─ handleRequest()            services/api/base.service.ts     throws on failure, logs out on 401
       └─ executeServerRequest() services/api/server-request.ts  server action: parses JSON, revalidates tags
            └─ apiInterceptor()  services/api/api.interceptor.ts adds headers and the access token
                 └─ fetch(API_URL + slug)
```

`executeServerRequest` is a server action, so calls made from client components still run on the server. `API_URL` is never sent to the browser.

| File                              | Responsibility                                                          |
| --------------------------------- | ----------------------------------------------------------------------- |
| `services/api/base.service.ts`    | Public entry point. Turns failed results into throws and handles logout |
| `services/api/server-request.ts`  | Runs the request, parses the body, returns an `ok` / error result       |
| `services/api/api.interceptor.ts` | Sets headers, attaches the token, forwards the visitor's IP on writes   |
| `services/api/api-errors.ts`      | `ApiError` with `status` and `errors`                                   |
| `constants/api/index.ts`          | `API_URL` and the endpoint constants                                    |
| `constants/cookie.ts`             | Auth cookie names and lifetimes                                         |
| `app/api/auth/clear/route.ts`     | Deletes the auth cookies and redirects                                  |

## Setup

Set these in `.env` (see `.env.example`):

| Variable                   | Required           | Purpose                                                                 |
| -------------------------- | ------------------ | ----------------------------------------------------------------------- |
| `API_URL`                  | Yes                | Backend base URL, e.g. `http://localhost:8000/api`. Server-only         |
| `ENCRYPTION_KEY`           | If encryption used | 32-byte Base64 or 64-character hex key for `utils/encryption.server.ts` |
| `ENCRYPTION_KEY_PREVIOUS`  | No                 | Old key during a rotation, so existing values still decrypt             |
| `TRUSTED_CLIENT_IP_HEADER` | No                 | Header your proxy sets with the visitor's IP, e.g. `cf-connecting-ip`   |

Only set `TRUSTED_CLIENT_IP_HEADER` when a proxy overwrites that header. Otherwise a browser could fake its address.

**Add a `/login` page.** The starter doesn't ship one, but an expired session in the browser redirects there.

**Store the token after login.** The interceptor reads the access token from the `COOKIE_NAMES.ACCESS_TOKEN` cookie. Login and token refresh depend on your backend's response format, so the starter leaves them to you:

```ts
import CookieService from '@/services/app/cookie.service';

import { AUTH_COOKIES_DURATION_DAYS, COOKIE_NAMES, COOKIE_SECURE } from '@/constants/cookie';

// In a server action or route handler
await CookieService.store(COOKIE_NAMES.ACCESS_TOKEN, token, {
  expires: AUTH_COOKIES_DURATION_DAYS,
  httpOnly: true,
  secure: COOKIE_SECURE,
  sameSite: 'lax',
  path: '/',
});
```

## Writing a service

Keep endpoints in `constants/api/` and wrap them in a static service class. `npm run make:module <name>` scaffolds both.

```ts
import { AUTH_LOGIN } from '@/constants/api';
import type { User } from '@/types';

import { handleRequest } from './base.service';

export default class UserService {
  static me = () => handleRequest<User>('/auth/me', { requiresAuth: true, cache: 'no-store' });

  static update = (id: string, payload: Partial<User>) =>
    handleRequest<User>(
      `/users/${id}`,
      {
        requiresAuth: true,
        method: 'PUT',
        body: JSON.stringify(payload),
        revalidateTags: ['users'],
      },
      'raw',
    );

  static login = (payload: { email: string; password: string }) =>
    handleRequest<{ token: string }>(AUTH_LOGIN, { method: 'POST', body: JSON.stringify(payload) }, 'raw');
}
```

## Options

`handleRequest<T>(slug, options, mode)` accepts everything `fetch` does, plus:

| Option           | Default | Effect                                                                           |
| ---------------- | ------- | -------------------------------------------------------------------------------- |
| `requiresAuth`   | `false` | Sends `Authorization: Bearer <token>`. Fails with 401 if there is no token       |
| `revalidateTags` | none    | Clears these Next.js cache tags after a successful response. Server actions only |
| `cachedRead`     | `false` | Set on reads inside `use cache: private`, where `connection()` isn't allowed     |

`slug` is appended to `API_URL`. `Content-Type: application/json` is set automatically, except for `FormData` bodies.

## Error handling

| Situation                             | `mode: 'normal'` (default)            | `mode: 'raw'`                        |
| ------------------------------------- | ------------------------------------- | ------------------------------------ |
| Non-2xx response                      | Throws `Error` with the API `message` | Throws the parsed API body           |
| 401 on a `requiresAuth` request       | Clears the session and redirects      | Clears the session and redirects     |
| Network failure or other thrown error | Throws `Error` with its message       | Throws `{ status, message, errors }` |

Use `'raw'` for forms, so you can show field errors from the API:

```ts
try {
  await UserService.update(id, values);
} catch (error) {
  // Laravel-style validation body: { message, errors: { name: ['The name field is required.'] } }
  console.log(error);
}
```

### Expired sessions

On a 401 for a `requiresAuth` request, the user goes to `/api/auth/clear`, which deletes every cookie in `COOKIE_NAMES`.

- **From the browser:** they then land on `/login?redirect=<current page>`. The redirect value is obfuscated with `utils/redirect-encryption.ts`, which isn't a security measure.
- **From the server:** they land on `/`.

Redirects are thrown by Next.js, so rethrow them if you wrap server code in `try/catch`. `unstable_rethrow` from `next/navigation` does this.

## Caching

Each uncached request calls `connection()`, which makes the page render at request time. To cache a read, use `use cache` or `use cache: private` and pass `cachedRead: true`, then clear it from a write with `revalidateTags`. Both directives need `cacheComponents: true` in `next.config.ts`.

## Encryption

`utils/encryption.server.ts` is AES-256-GCM and can only be imported from server code, so the key can't reach the browser.

```ts
import { decryptData, encryptData } from '@/utils/encryption.server';

const token = encryptData({ userId: '42' }, 'password-reset', { ttlSeconds: 900 });
const data = decryptData<{ userId: string }>(token, 'password-reset'); // null if tampered with or expired
```

The second argument is a context label: a value encrypted with one label won't decrypt with another.
