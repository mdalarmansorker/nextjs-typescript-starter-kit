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

- `API_URL`, the access token and `ENCRYPTION_KEY` are read on the server only. API calls run in a server action even when started from the browser.
- Auth cookies should be `httpOnly` (see [auth-and-cookies.md](auth-and-cookies.md)), so page scripts can't read them.
- `*.server.ts` modules import `server-only`, so the build fails if one ends up in a client bundle.

### API requests stay inside API_URL

`executeServerRequest` is a server action, which means any visitor can call it with any arguments. It refuses a path that doesn't start with a single `/` or that resolves outside `API_URL` (`/../admin`, `@other-host`), so it can't be used to reach other servers or other paths on the API host.

It still forwards any path under `API_URL`, with the visitor's own token, and any `revalidateTags`. That is fine when every endpoint enforces its own authorization (it should), but anyone can clear any cache tag. If that matters, call the API from domain-specific server actions instead and validate their input.

### Redirects stay on the site

`decryptRedirectUrl` only returns paths on this site. Use `isSafeRedirectPath` from `utils/redirect-encryption.ts` for any other redirect target that comes from a URL or form.

### Visitor IP addresses

The visitor's IP is forwarded to the API (`X-Forwarded-For`) on non-GET requests, so the API can rate-limit logins per address. It is only read from `TRUSTED_CLIENT_IP_HEADER`, and only set that when your proxy (Cloudflare, nginx, a load balancer) overwrites the header. Otherwise a visitor could send any address and get around the limit. The value must look like an IP address or it is dropped.

### Encryption

`utils/encryption.server.ts` uses AES-256-GCM with a purpose label, expiry and key rotation. See [encryption.md](encryption.md).

## Decide for your deployment

### Strict-Transport-Security (HSTS)

Tells browsers to only use HTTPS. Many hosts (Vercel, Cloudflare) can add it; otherwise add it to `securityHeaders` once the whole domain is on HTTPS:

```ts
{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
```

Browsers remember it for `max-age`, so start lower (e.g. `max-age=300`) if you're unsure.

### Content-Security-Policy (CSP)

Limits where scripts, styles and images can load from. It is the main defense against XSS, but it depends on every script and service the app uses (analytics, fonts, payment widgets), so it isn't set by default. Next.js supports nonce-based policies set in `proxy.ts`; see the Next.js Content Security Policy guide.

### Logout via GET

`/api/auth/clear` ends the session on a GET request, so another site could log users out by embedding it (an image tag pointing at it). That is a nuisance, not a data leak. If it matters, change it to POST and log out with a form.

## Checklist before going live

- [ ] `ENCRYPTION_KEY` is set and is not the one from development
- [ ] `TRUSTED_CLIENT_IP_HEADER` is set only if your proxy overwrites that header
- [ ] Auth cookies are set with `httpOnly`, `secure` and `sameSite`
- [ ] Pages that need login are protected (see [auth-and-cookies.md](auth-and-cookies.md#to-build-yourself))
- [ ] HSTS is on (from your host or `next.config.ts`)
- [ ] You've decided on a Content-Security-Policy
- [ ] `npm audit` reports no high-severity issues
