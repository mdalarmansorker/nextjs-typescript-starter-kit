import { z } from 'zod';

import { parseEncryptionKey } from './encryption-key';

/** Unset and blank count as "not set": many deploy tools can only blank a variable, not remove it. */
const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess(value => (typeof value === 'string' && value.trim() === '' ? undefined : value), schema.optional());

const httpUrl = (name: string) =>
  z.url({ protocol: /^https?$/, error: `${name} must be an http(s) URL, e.g. https://api.example.com` });

const encryptionKey = (name: string) =>
  z.string().refine(
    value => {
      try {
        parseEncryptionKey(value, name);
        return true;
      } catch {
        return false;
      }
    },
    { error: `${name} must be a 32-byte Base64 key (openssl rand -base64 32) or 64 hex characters` },
  );

/**
 * The environment variables the app reads, with their rules. Add a variable here when you add it to
 * `.env.example`, so a wrong value stops the server at startup instead of failing on some later request.
 */
const EnvSchema = z
  .object({
    // Optional so the UI can be built and deployed before the API exists; see `envWarnings`.
    API_URL: optional(httpUrl('API_URL')),
    NEXT_PUBLIC_APP_URL: optional(httpUrl('NEXT_PUBLIC_APP_URL')),
    ENCRYPTION_KEY: optional(encryptionKey('ENCRYPTION_KEY')),
    ENCRYPTION_KEY_PREVIOUS: optional(encryptionKey('ENCRYPTION_KEY_PREVIOUS')),
    TRUSTED_CLIENT_IP_HEADER: optional(
      z.string().regex(/^[A-Za-z0-9-]+$/, 'TRUSTED_CLIENT_IP_HEADER must be a header name, e.g. x-real-ip'),
    ),
  })
  .refine(env => !env.ENCRYPTION_KEY_PREVIOUS || env.ENCRYPTION_KEY, {
    error: 'ENCRYPTION_KEY_PREVIOUS is set without ENCRYPTION_KEY',
    path: ['ENCRYPTION_KEY'],
  });

/** Returns one message per invalid variable; empty when the environment is valid. */
export const validateEnv = (env: Record<string, string | undefined>): string[] => {
  const result = EnvSchema.safeParse(env);

  return result.success ? [] : result.error.issues.map(issue => issue.message);
};

const isUnset = (value: string | undefined) => value === undefined || value.trim() === '';

/**
 * Variables that are allowed to be missing but limit what the app can do. Returns one message per
 * variable; empty when nothing is missing.
 */
export const envWarnings = (env: Record<string, string | undefined>): string[] =>
  isUnset(env.API_URL)
    ? ['API_URL is not set: pages and actions that call the API will fail until you add it (see .env.example).']
    : [];

/**
 * Throws one error listing every invalid variable, then logs a warning for each missing optional one. Called from `register()` in `instrumentation.ts`,
 * so the server refuses to start with a broken configuration but starts without the API configured.
 */
export const assertValidEnv = (env: Record<string, string | undefined>): void => {
  const problems = validateEnv(env);

  if (problems.length > 0) {
    throw new Error(
      `Invalid environment variables (see .env.example and docs/environment-variables.md):\n` +
        problems.map(problem => `  - ${problem}`).join('\n'),
    );
  }

  for (const warning of envWarnings(env)) {
    console.warn(`Warning: ${warning}`);
  }
};
