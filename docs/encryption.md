# Encryption

The kit has two different tools. Pick by what you need:

| File                           | Strength                     | Runs on          | Use for                                        |
| ------------------------------ | ---------------------------- | ---------------- | ---------------------------------------------- |
| `utils/encryption.server.ts`   | AES-256-GCM, authenticated   | Server only      | Secrets and data users must not read or change |
| `utils/redirect-encryption.ts` | Obfuscation only, public key | Server + browser | Hiding the post-login redirect path in the URL |

## encryption.server.ts

Encrypts JSON data with a secret key from `ENCRYPTION_KEY`. A value that was changed, encrypted with another key, encrypted for another purpose, or has expired decrypts to `null`.

```ts
import { decryptData, encryptData } from '@/utils/encryption.server';

const token = encryptData({ userId: '42' }, 'password-reset', { ttlSeconds: 900 });

const data = decryptData<{ userId: string }>(token, 'password-reset');
// { userId: '42' }, or null when tampered with, expired or from another context
```

### Setup

Generate a key and put it in `ENCRYPTION_KEY`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

A 64-character hex key works too. A missing or malformed key **throws** on first use, so a bad deploy fails loudly instead of silently turning every value into `null`. The key is read lazily, so `next build` works without it.

### API

| Function                                                 | Returns                                                      |
| -------------------------------------------------------- | ------------------------------------------------------------ |
| `encryptData(data, context?, { ttlSeconds? })`           | `v1.<base64url>`, or `null` when the data can't be encrypted |
| `decryptData<T>(value, context?, { validate? })`         | The data, or `null`                                          |
| `decryptDataWithMeta<T>(value, context?, { validate? })` | `{ data, rotated }`, or `null`                               |

- **`context`** labels what a value is for (`'permissions-cookie'`, `'password-reset'`). A value only decrypts with the same label, so one encrypted value can't be swapped in for another. Always pass one.
- **`ttlSeconds`** makes the value expire. The expiry is inside the encrypted data, so it can't be changed. With several servers, keep TTLs in minutes rather than seconds to allow for clock differences.
- **`validate`** checks the decrypted shape at runtime. Without it, `T` is only a cast:

  ```ts
  const isPermissions = (d: unknown): d is string[] => Array.isArray(d) && d.every(p => typeof p === 'string');

  const permissions = decryptData(cookieValue, 'permissions-cookie', { validate: isPermissions });
  ```

### What can be encrypted

Strings, finite numbers, booleans, arrays and plain objects, with `null` allowed inside them. Anything JSON would silently change is refused (`encryptData` returns `null` and logs why): `undefined`, functions, `Date`, `Map`, `Set`, class instances, `NaN`, `Infinity`, `bigint`. Convert a `Date` with `.toISOString()` first.

The encoded value is limited to 64 KiB (about 48 KiB of data). Cookies are limited to about 4 KB, so keep cookie payloads small.

### Rotating the key

1. Set `ENCRYPTION_KEY_PREVIOUS` to the current key and `ENCRYPTION_KEY` to a new one. Deploy.
2. Old values still decrypt. `decryptDataWithMeta` returns `rotated: true` for them; re-encrypt and store them again (e.g. re-set the cookie).
3. Once old values have expired or been re-encrypted, empty `ENCRYPTION_KEY_PREVIOUS`. Deploy.

### Testing code that uses it

The module caches its keys, so a test that changes them must load a fresh copy. See `utils/encryption.server.test.ts`:

```ts
vi.stubEnv('ENCRYPTION_KEY', key);
vi.resetModules();
const { encryptData } = await import('@/utils/encryption.server');
```

## redirect-encryption.ts

`encryptRedirectUrl(path)` and `decryptRedirectUrl(value)` hide the redirect path in `/login?redirect=…`. The key is in the source and shipped to the browser, so **this is not security**: anyone can decrypt or create values. `decryptRedirectUrl` only returns paths on this site, so a crafted value can't send users elsewhere. See [auth-and-cookies.md](auth-and-cookies.md#returning-the-user-after-login).
