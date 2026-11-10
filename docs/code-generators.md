# Code Generators

Two scripts create the boilerplate for a feature with the project's naming and patterns. They run with Node's built-in TypeScript support (Node 22.18 or newer), so there's nothing to install.

## make:module

```bash
npm run make:module blogPost
```

The name can be in any case: `blogPost`, `BlogPost`, `blog_post` and `blog-post` all give the same result.

| File created                         | Contents                                                                                               |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| `app/blog-posts/page.tsx`            | Route that renders the view                                                                            |
| `views/blog-posts/BlogPosts.tsx`     | View component with a heading                                                                          |
| `services/api/blog_posts.service.ts` | Server-only `BlogPostService` with `index`, `show`, `store`, `update`, `destroy` using `handleRequest` |
| `types/blog_posts.ts`                | `BlogPost` interface with `id`                                                                         |
| `constants/api/blog_posts.api.ts`    | `BLOG_POSTS = '/blog-posts'`                                                                           |

It also adds exports to `types/index.ts` and `constants/api/index.ts`, then runs ESLint and Prettier on the files so they match the rest of the code.

If **any** of the files already exists, it stops before writing anything.

After generating:

1. Add the real fields to the type.
2. Check the endpoint path in the constant matches your API.
3. Remove `requiresAuth: true` from public endpoints, add `parse` to check responses, and add `revalidateTags` to writes if you cache reads. See [api-layer.md](api-layer.md).
4. Build the view: read data in the page (a Server Component) and write through server actions. See [api-layer.md](api-layer.md#where-requests-run).

## make:type

```bash
npm run make:type category
```

Creates `types/categories.ts` with a `Category` interface and exports it from `types/index.ts`. Refuses to overwrite an existing file.

## Naming rules

Names are split into words, and the last word is pluralized for file and route names:

| Input         | Type          | Files           | Route            | Constant        |
| ------------- | ------------- | --------------- | ---------------- | --------------- |
| `blogPost`    | `BlogPost`    | `blog_posts`    | `/blog-posts`    | `BLOG_POSTS`    |
| `category`    | `Category`    | `categories`    | `/categories`    | `CATEGORIES`    |
| `HTTPRequest` | `HttpRequest` | `http_requests` | `/http-requests` | `HTTP_REQUESTS` |

Pluralization follows the regular English rules (`-s`, `-es`, consonant + `y` → `-ies`). Irregular words like `person` become `persons`; rename the files if you want `people`.

Names must start with a letter and contain only letters and digits (plus `-`, `_` or spaces between words).

## Changing the generators

The scripts are `scripts/make-module.mts` and `scripts/make-type.mts`; shared helpers (name handling, writing files, formatting) are in `scripts/utils.mts` and tested in `scripts/utils.test.ts`. They are `.mts` so Node runs them as ES modules without `"type": "module"` in `package.json`.
