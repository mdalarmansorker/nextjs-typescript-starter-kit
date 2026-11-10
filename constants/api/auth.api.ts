export const AUTH_LOGIN: string = '/auth/login';
export const AUTH_REGISTER: string = '/auth/register';
/** Revokes the token on the API at logout. Set to `null` if your API has no logout endpoint. */
export const AUTH_LOGOUT: string | null = '/auth/logout';
/**
 * Exchanges a refresh token for a new access token. Only used when the login response included a
 * refresh token. Set to `null` to turn token refresh off.
 */
export const AUTH_REFRESH: string | null = '/auth/refresh';
