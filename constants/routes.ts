/** Where logged-out users are sent, with `?redirect=` set to the page they wanted. */
export const LOGIN_ROUTE = '/login';

/** Route handler that refreshes the access token and redirects back (`?redirect=`). */
export const REFRESH_ROUTE = '/api/auth/refresh';

/** Where users go after logging in when there's no page to return to. */
export const AFTER_LOGIN_ROUTE = '/dashboard';

/**
 * Pages that need a logged-in user. A path matches when it equals an entry or starts with it plus `/`
 * (`/dashboard` covers `/dashboard/settings`). Add your own sections here.
 */
export const PROTECTED_ROUTES = ['/dashboard'];

/** Pages for logged-out users only. Logged-in users are sent to AFTER_LOGIN_ROUTE. */
export const GUEST_ONLY_ROUTES = [LOGIN_ROUTE];

/** Request header the proxy sets with the current path and query, for server code that needs it. */
export const CURRENT_PATH_HEADER = 'x-current-path';

/** True when `pathname` is one of `routes` or below one of them. */
export const matchesRoute = (pathname: string, routes: readonly string[]): boolean =>
  routes.some(route => pathname === route || pathname.startsWith(`${route}/`));
