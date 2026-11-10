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

Set `API_URL` in `.env.local`, e.g. `http://localhost:8000/api` (see [environment-variables.md](environment-variables.md)). Without it every request fails with "API_URL is not set".

For logins and expired sessions you also need a `/login` page and code that stores the token after login. See [auth-and-cookies.md](auth-and-cookies.md).

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

`slug` is appended to `API_URL` and must start with `/`. A slug that would leave `API_URL` (`/../admin`, `@other-host`) is refused with a 400 result, because any visitor can call the server action with any slug (see [security.md](security.md#api-requests-stay-inside-api_url)).

`Content-Type: application/json` is set automatically, except for `FormData` bodies.

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

- **From the browser:** they then land on `/login?redirect=<current page>`. The redirect value is obfuscated with `utils/redirect-encryption.ts`; see [auth-and-cookies.md](auth-and-cookies.md#returning-the-user-after-login) for reading it back safely.
- **From the server:** they land on `/`.

Redirects are thrown by Next.js, so rethrow them if you wrap server code in `try/catch`. `unstable_rethrow` from `next/navigation` does this.

## Caching

Each uncached request calls `connection()`, which makes the page render at request time. To cache a read, use `use cache` or `use cache: private` and pass `cachedRead: true`, then clear it from a write with `revalidateTags`. Both directives need `cacheComponents: true` in `next.config.ts`.

## Testing

Each layer is tested with the layer below it mocked: `base.service.test.ts` mocks `executeServerRequest`, `server-request.test.ts` mocks `apiInterceptor`, and `api.interceptor.test.ts` mocks `fetch`. To test a domain service, mock `handleRequest`:

```ts
vi.mock('@/services/api/base.service', () => ({ handleRequest: vi.fn() }));
```

See [testing.md](testing.md).
