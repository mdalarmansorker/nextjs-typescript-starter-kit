# Example Module: Projects

`/projects` is a complete CRUD module to copy from: a paginated list, create and edit forms with validation errors, delete, and a 404 for unknown ids. It runs against the mock API in the e2e tests and against your backend when it has the same endpoints.

It started as `npm run make:module project` and was then filled in, so it shows what the generated files grow into.

## Files

| File                               | What it shows                                                                                 |
| ---------------------------------- | --------------------------------------------------------------------------------------------- |
| `constants/api/projects.api.ts`    | Endpoint path                                                                                 |
| `types/projects.ts`                | `Project` and `ProjectPayload` types                                                          |
| `services/api/projects.service.ts` | One method per endpoint, every response checked with zod, the list read with `parsePage`      |
| `app/projects/page.tsx`            | Reads `?page=` and the list in a Server Component                                             |
| `app/projects/new/page.tsx`        | Create page                                                                                   |
| `app/projects/[id]/edit/page.tsx`  | Loads the project, `notFound()` on a 404, binds the id into the update action                 |
| `app/projects/actions.ts`          | Server actions: zod validation, the API's 4xx errors returned to the form, 404 and 5xx thrown |
| `views/projects/Projects.tsx`      | The list, with edit links and delete forms                                                    |
| `views/projects/ProjectForm.tsx`   | Shared create / edit form with `useActionState`, errors linked to fields                      |
| `components/Pagination.tsx`        | Previous / next links, reusable for any list                                                  |
| `e2e/projects.spec.ts`             | The whole flow in a browser; the endpoints are in `e2e/mock-api.mjs`                          |

## The endpoints it expects

| Request                                | Response                                                                                      |
| -------------------------------------- | --------------------------------------------------------------------------------------------- |
| `GET /projects?page=2&per_page=10`     | A paginated list in any shape `parsePage` reads (see [api-layer.md](api-layer.md#pagination)) |
| `GET /projects/:id`                    | The project, bare or as `{ data: … }`; 404 when unknown                                       |
| `POST /projects { name, description }` | The created project; 422 `{ message, errors: { name: [...] } }` when invalid                  |
| `PUT /projects/:id`                    | The updated project; 404 or 422                                                               |
| `DELETE /projects/:id`                 | Any 2xx; a 404 counts as already deleted                                                      |

All of them need the logged-in user's token (`requiresAuth: true`), and `/projects` is in `PROTECTED_ROUTES`.

## How errors flow

| What goes wrong                               | Where it ends up                                                                                  |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Empty name, too long                          | The action's zod schema; shown next to the field, nothing sent                                    |
| The API refuses it (422, e.g. duplicate name) | `ApiError.fieldErrors`, shown next to the field; typed values kept                                |
| The project doesn't exist (404)               | The 404 page                                                                                      |
| The API is down (5xx, timeout)                | Thrown to `app/error.tsx` and logged by `instrumentation.ts`                                      |
| The token expired                             | Refreshed, or the user is sent to login and back (see [auth-and-cookies.md](auth-and-cookies.md)) |

## Removing it

Delete these, then run `npm run typecheck`:

- `app/projects/`, `views/projects/`, `services/api/projects.service.ts` and its test, `types/projects.ts`, `constants/api/projects.api.ts`, `e2e/projects.spec.ts`
- the exports in `types/index.ts` and `constants/api/index.ts`
- `'/projects'` in `PROTECTED_ROUTES` (`constants/routes.ts`), the link on `app/dashboard/page.tsx`, and the projects part of `e2e/mock-api.mjs`

Keep `components/Pagination.tsx`, `services/api/pagination.ts` and `types/pagination.ts`: they aren't specific to projects.
