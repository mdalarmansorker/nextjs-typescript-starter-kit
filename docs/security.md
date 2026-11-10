# Security

What the kit already does, and what you need to decide for your deployment.

## Built in

### Response headers

`next.config.ts` sends these with every response:

| Header                   | Value                                                          | Protects against                        |
| ------------------------ | -------------------------------------------------------------- | --------------------------------------- |
| `X-Content-Type-Options` | `nosniff`                                                      | Browsers running a file as another type |
| `X-Frame-Options`        | `DENY`                                                         | Clickjacking (the app inside an iframe) |
| `Referrer-Policy`        | `strict-origin-when-cross-origin`                              | Full URLs leaking to other sites        |
| `Permissions-Policy`     | `camera=(), microphone=(), geolocation=(), browsing-topics=()` | Unused browser features being used      |

`X-Powered-By` is turned off. If the app must be embedded in a frame, or needs the camera or location, change these in `next.config.ts`.

### Secrets stay on the server

- `API_URL`, the access token and `ENCRYPTION_KEY` are read on the server only. The API layer imports `server-only`, so the build fails if a client component imports it.
- The access and refresh tokens are stored in `httpOnly` cookies, so page scripts (including injected ones) can't read them. Logout asks the API to revoke both.
- The API layer is not a server action, so visitors can't call it with their own arguments. Client components reach the API only through server actions you write, which validate their input (see `app/login/actions.ts`).

### API requests stay inside API_URL

Paths are built from slugs that often contain user input (`/users/${id}`). `executeServerRequest` refuses a slug that doesn't start with a single `/` or that resolves outside `API_URL` (`/../admin`, `@other-host`), so a crafted ID can't reach other servers or other paths on the API host. Encode IDs with `encodeURIComponent` as well.

### API failures don't leak

Requests time out after 10 seconds, so a hanging API can't tie up the server. Responses can be checked with `parse`. Messages of 5xx errors (which can contain internal addresses) are logged, not shown: see [api-layer.md](api-layer.md#error-handling). Error pages show only a reference ID (`digest`); the details are in the server log.

### Login and logout

- Login forms are validated on the server with zod before the API is called. The password is never returned to the browser.
- Pages in `PROTECTED_ROUTES` redirect logged-out users to login. The API still checks the token on every request; the proxy only checks that a token exists.
- `/api/auth/clear` ignores requests started by other sites (`Sec-Fetch-Site`), so another site can't log users out.
- Post-login redirects only go to paths on this site (`utils/redirect-path.ts`).

See [auth-and-cookies.md](auth-and-cookies.md).

### Visitor IP addresses

The visitor's IP is forwarded to the API (`X-Forwarded-For`) on non-GET requests, so the API can rate-limit logins per address. It is only read from `TRUSTED_CLIENT_IP_HEADER`, and only set that when your proxy (Cloudflare, nginx, a load balancer) overwrites the header. Otherwise a visitor could send any address and get around the limit. The value must look like an IP address or it is dropped.

### Error reporting

`instrumentation.ts` receives every server error (pages, server actions, route handlers, proxy) and logs it as one JSON line without request headers, so tokens in cookies never reach the logs. Connect your error tracker there.

### Encryption

`utils/encryption.server.ts` uses AES-256-GCM with a purpose label, expiry and key rotation. See [encryption.md](encryption.md).

### Supply chain

- `npm audit` runs in CI and fails on high or critical advisories in runtime dependencies.
- GitHub Actions are pinned to commit SHAs, so a moved tag can't run other code in CI.
- Dependabot opens update pull requests weekly (npm) and monthly (Actions).

## Decide for your deployment

### Strict-Transport-Security (HSTS)

Tells browsers to only use HTTPS. Many hosts (Vercel, Cloudflare) can add it; otherwise add it to `securityHeaders` once the whole domain is on HTTPS:

```ts
{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
```

Browsers remember it for `max-age`, so start lower (e.g. `max-age=300`) if you're unsure.

### Content-Security-Policy (CSP)

Limits where scripts, styles and images can load from. It is the main defense against XSS, but it depends on every script and service the app uses (analytics, fonts, payment widgets), so it isn't set by default. Next.js supports nonce-based policies set in `proxy.ts`; see the Next.js Content Security Policy guide.

### Rate limiting

Login attempts should be limited per account and per IP address. Do this in the API (it receives the visitor's IP, see above) or at your proxy.

## Checklist before going live

- [ ] `ENCRYPTION_KEY` is set and is not the one from development
- [ ] `TRUSTED_CLIENT_IP_HEADER` is set only if your proxy overwrites that header
- [ ] `TokenResponseSchema` matches your login and refresh responses, and every protected section is in `PROTECTED_ROUTES`
- [ ] Every API endpoint checks the token and the user's permissions itself
- [ ] The API rate-limits login attempts
- [ ] HSTS is on (from your host or `next.config.ts`)
- [ ] You've decided on a Content-Security-Policy
- [ ] An error tracker is connected in `instrumentation.ts`
- [ ] CI is green, including the audit
