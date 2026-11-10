# API Layer

How this project talks to the backend API. Every request goes through `handleRequest` in `services/api/base.service.ts`; don't call `fetch` against the API directly.

## Where requests run

The API layer is **server-only**: `API_URL` and the access token never reach the browser, and a client component that imports it fails the build.

| You want to…                          | Do it in                                  |
| ------------------------------------- | ----------------------------------------- |
| Show data on a page                   | A Server Component that calls the service |
| Change data from a form or button     | A server action that calls the service    |
| Fetch from the browser (polling etc.) | A route handler that calls the service    |

Don't use server actions to read data. The browser runs server actions one at a time, so three reads in a `Promise.all` wait for each other, and their results can't be cached.

```tsx
// app/projects/page.tsx: a Server Component reads
export default async function ProjectsPage() {
  const projects = await ProjectService.index();

  return <ProjectList projects={projects} />;
}
```

```ts
// app/projects/actions.ts: a server action writes
'use server';

export async function createProject(_previous: FormState, formData: FormData): Promise<FormState> {
  try {
    await ProjectService.store({ name: String(formData.get('name')) });
  } catch (error) {
    if (error instanceof ApiError && error.status < 500) {
      return { message: error.message, fieldErrors: error.fieldErrors };
    }
    throw error;
  }

  redirect('/projects');
}
```

`app/login/actions.ts` is a complete example.

## Request flow

```
Server Component / server action / route handler
  └─ ProjectService.index()       services/api/<resource>.service.ts
       └─ handleRequest()          services/api/base.service.ts      throws ApiError, ends expired sessions, parses
            └─ executeServerRequest()  services/api/server-request.ts  builds the URL, reads JSON, revalidates tags
                 └─ apiInterceptor()   services/api/api.interceptor.ts  headers, token, timeout
                      └─ fetch(API_URL + slug)
```

| File                              | Responsibility                                                                    |
| --------------------------------- | --------------------------------------------------------------------------------- |
| `services/api/base.service.ts`    | Public entry point. Throws `ApiError`, checks responses with `parse`, handles 401 |
| `services/api/server-request.ts`  | Keeps the URL inside `API_URL`, parses the body, maps timeouts and network errors |
| `services/api/api.interceptor.ts` | Sets headers, attaches the token, forwards the visitor's IP on writes, timeout    |
| `services/api/api-errors.ts`      | `ApiError` with `status` and `errors`                                             |
| `services/api/auth.service.ts`    | Login request, with its response checked by a zod schema                          |
| `constants/api/`                  | `API_URL`, `API_TIMEOUT_MS` and the endpoint paths                                |

## Setup

Set `API_URL` in `.env.local`, e.g. `http://localhost:8000/api` (see [environment-variables.md](environment-variables.md)). Without it every request fails with "API_URL is not set".

Login, sessions and route protection are described in [auth-and-cookies.md](auth-and-cookies.md).

## Writing a service

Keep endpoint paths in `constants/api/` and wrap them in a static service class. `npm run make:module <name>` creates both.

```ts
import 'server-only';

import { z } from 'zod';

import { PROJECTS } from '@/constants/api';

import { handleRequest } from './base.service';

const ProjectSchema = z.object({ id: z.string(), name: z.string() });

export type Project = z.infer<typeof ProjectSchema>;

export default class ProjectService {
  static index = () =>
    handleRequest(PROJECTS, { requiresAuth: true, parse: data => z.array(ProjectSchema).parse(data) });

  static store = (payload: Omit<Project, 'id'>) =>
    handleRequest(PROJECTS, {
      requiresAuth: true,
      method: 'POST',
      body: JSON.stringify(payload),
      parse: data => ProjectSchema.parse(data),
      revalidateTags: ['projects'],
    });
}
```

Encode values you put in a path: `` `${PROJECTS}/${encodeURIComponent(id)}` ``.

## Options

`handleRequest<T>(slug, options)` accepts everything `fetch` does, plus:

| Option            | Default                 | Effect                                                                                      |
| ----------------- | ----------------------- | ------------------------------------------------------------------------------------------- |
| `requiresAuth`    | `false`                 | Sends `Authorization: Bearer <token>`. Fails with 401 if there is no token                  |
| `query`           | none                    | Query parameters, encoded. `null`/`undefined` are left out; arrays repeat the key           |
| `endSessionOn401` | `true`                  | On a 401 for a `requiresAuth` request, end the session. `false` throws the `ApiError`       |
| `parse`           | none                    | Checks the response and returns it typed; a wrong shape throws a 502 `ApiError`             |
| `timeoutMs`       | `API_TIMEOUT_MS` (10 s) | Cancels the request after this long; throws a 504 `ApiError`                                |
| `revalidateTags`  | none                    | Clears these cache tags after a successful response. Server actions and route handlers only |
| `cachedRead`      | `false`                 | Set on reads inside `use cache: private`, where `connection()` isn't allowed                |

`slug` is appended to `API_URL` and must start with `/`. A slug that would leave `API_URL` (`/../admin`, `@other-host`) is refused with a 400, because slugs often contain user input.

Pass query parameters with `query` instead of building the string yourself, so values are encoded:

```ts
handleRequest('/projects', { requiresAuth: true, query: { page: 2, search, status: ['active', 'paused'] } });
// → /projects?page=2&search=…&status=active&status=paused
```

For APIs that expect PHP-style arrays (`status[]=active`), name the key `'status[]'`.

`Accept: application/json` is always sent, and `Content-Type: application/json` when there is a body that isn't `FormData`.

### Checking responses with `parse`

Without `parse`, the response is only cast to `T`: if the API changes shape, the app breaks somewhere unrelated. With it, a wrong shape fails right here, the details go to the server log, and the caller gets `ApiError` with status 502. `parse` takes any function that returns the data or throws, so it works with zod (installed) or any other schema library.

## Error handling

`handleRequest` throws `ApiError` (a subclass of `Error`) for every failure:

| Situation                          | `status`                                           | `message`                                  | `errors`         |
| ---------------------------------- | -------------------------------------------------- | ------------------------------------------ | ---------------- |
| The API answered with 4xx / 5xx    | The API's status                                   | The API's message (see below)              | The API's errors |
| 401 on a `requiresAuth` request    | Ends the session and redirects to login (no throw) |                                            |                  |
| Response doesn't match `parse`     | 502                                                | "The API returned an unexpected response." |                  |
| Timeout                            | 504                                                | "The API did not respond in time."         |                  |
| Network failure, `API_URL` missing | 500                                                | The underlying error                       |                  |
| Slug leaves `API_URL`              | 400                                                | "Invalid API path …"                       |                  |

### Error bodies from different APIs

Backends shape error bodies differently. `readApiError` in `services/api/api-errors.ts` reads the message and field errors from the common shapes: `{ message, errors }` (Laravel, NestJS), `{ error: '…' }` (Express, Rails), `{ error: { message, details } }`, `{ detail }` (Django REST Framework, FastAPI) and RFC 9457 problem details (`{ title, detail, errors }`). If your API uses another shape, change that one function.

`ApiError.errors` holds the field errors as the API sent them. `ApiError.fieldErrors` holds them as `{ field: ['message'] }`, ready for a form, whether the API sent an object of messages (`{ email: ['Taken'] }`) or a list of entries naming the field (FastAPI's `loc`, zod's `path`, `field`, `param`, JSON:API's `source.pointer`). It's `undefined` when there are none.

**Show 4xx messages to the user; log 5xx.** A 4xx `message` comes from your API and is meant for users ("These credentials do not match our records."). A 5xx message can contain internal details (`connect ECONNREFUSED 10.0.0.5`).

**In server actions, return errors instead of throwing them.** In production Next.js replaces the message of an error thrown in a server action with a generic one, so the form couldn't show it. Catch `ApiError`, return `{ message, fieldErrors }`, and render it with `useActionState` (see `views/login/LoginForm.tsx`).

**In Server Components, let errors throw.** `app/error.tsx` shows a "Try again" page, and `instrumentation.ts` logs the error.

### Expired sessions

On a 401 for a `requiresAuth` request, `handleRequest` redirects to `/api/auth/clear?redirect=<current page>`, which deletes the auth cookies and sends the user to `/login`. After logging in they return to the page they were on. The current page comes from the `x-current-path` header that `proxy.ts` sets.

Redirects are thrown by Next.js, so rethrow them if you wrap server code in `try/catch`. `unstable_rethrow` from `next/navigation` does this, or call `redirect` outside the `try`.

## Caching

Each uncached request calls `connection()`, which makes the page render at request time. To cache a read, use `use cache` or `use cache: private` and pass `cachedRead: true`, then clear it from a write with `revalidateTags`. Both directives need `cacheComponents: true` in `next.config.ts`.

## Testing

Each layer is tested with the layer below it mocked: `base.service.test.ts` mocks `executeServerRequest`, `server-request.test.ts` mocks `apiInterceptor`, and `api.interceptor.test.ts` mocks `fetch`. To test a domain service, mock `handleRequest`; to test a server action, mock the service (see `app/login/actions.test.ts`):

```ts
vi.mock('@/services/api/auth.service', () => ({ default: { login: vi.fn() } }));
```

See [testing.md](testing.md).
