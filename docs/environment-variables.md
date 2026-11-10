# Environment Variables

Copy `.env.example` to `.env.local` and fill it in. `.env.local` is git-ignored; never commit real secrets.

```bash
cp .env.example .env.local
```

## Variables

| Variable                   | Where it's read  | Required           | Purpose                                                                                         |
| -------------------------- | ---------------- | ------------------ | ----------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_APP_NAME`     | Server + browser | No                 | App name in the page title (`Settings \| <name>`). Defaults to "Next.js Starter Kit"            |
| `NEXT_PUBLIC_APP_URL`      | Server + browser | In production      | Public URL of the app. Used as `metadataBase` for absolute Open Graph and canonical URLs        |
| `API_URL`                  | Server only      | Yes                | Backend base URL, e.g. `http://localhost:8000/api`. Requests fail with a clear error without it |
| `ENCRYPTION_KEY`           | Server only      | If encryption used | 32-byte key for `utils/encryption.server.ts`. See [encryption.md](encryption.md)                |
| `ENCRYPTION_KEY_PREVIOUS`  | Server only      | No                 | The old key during a key rotation                                                               |
| `TRUSTED_CLIENT_IP_HEADER` | Server only      | No                 | Header your proxy sets with the visitor's IP. See [security.md](security.md)                    |

## Rules

- **`NEXT_PUBLIC_` variables are public.** Next.js copies their values into the browser bundle at build time. Never put a secret in one, and rebuild after changing one.
- **Other variables are server-only** and are read when the code runs, so they can differ per deployment of the same build.
- **Don't set `NODE_ENV`.** `next dev` sets it to `development`, `next build` and `next start` to `production`, and Vitest to `test`. Setting it yourself makes Next.js warn and can break the build.
- **Referencing another variable** uses `$NAME`, e.g. `CALLBACK_URL=$NEXT_PUBLIC_APP_URL/callback`. Write `\$` for a literal dollar sign.

## Load order

Next.js loads, from highest to lowest priority: the real environment, `.env.$(NODE_ENV).local`, `.env.local` (skipped when testing), `.env.$(NODE_ENV)`, `.env`.

## Adding a variable

1. Add it to `.env.example` with a comment and a safe example value.
2. Add it to the table above.
3. If code can't work without it, fail with a clear message where it is read (as `services/api/server-request.ts` does for `API_URL`) instead of falling back silently.
4. Add it to your hosting provider and to CI if the build needs it.
