/**
 * Base URL of the backend API. Server-only: requests go through `services/api`, never from the browser.
 */
export const API_URL: string = process.env.API_URL || '';

/** How long an API request may take before it is cancelled. Override per request with `timeoutMs`. */
export const API_TIMEOUT_MS = 10_000;

/*
 * Endpoint paths live in one file per resource (`auth.api.ts`, `blog_posts.api.ts`) and are exported here.
 * `npm run make:module` adds the export for you.
 */
export * from './auth.api';
