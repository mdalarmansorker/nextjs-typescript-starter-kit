// TEST SETUP (academy backend): revert before committing.
export const AUTH_LOGIN: string = '/auth/v1/auth/login';
export const AUTH_REGISTER: string = '/auth/v1/auth/register';
/** Revokes the token on the API at logout. Set to `null` if your API has no logout endpoint. */
export const AUTH_LOGOUT: string | null = '/auth/v1/auth/logout';
/**
 * Exchanges a refresh token for a new access token. Only used when the login response included a
 * refresh token. Set to `null` to turn token refresh off.
 */
export const AUTH_REFRESH: string | null = '/auth/v1/auth/refresh';
/**
 * How the refresh request carries the refresh token: `'body'` sends `{ "refresh_token": "…" }`,
 * `'bearer'` sends `Authorization: Bearer <refresh token>` with no body.
 */
export const AUTH_REFRESH_TOKEN_IN: 'body' | 'bearer' = 'bearer';
