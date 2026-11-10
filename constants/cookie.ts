export const COOKIE_NAMES = {
  ACCESS_TOKEN: '__at',
  REFRESH_TOKEN: '__rt',
  PERMISSIONS: '__prm',
};

export const COOKIE_SECURE = process.env.NODE_ENV !== 'development';

export const AUTH_COOKIES_DURATION_DAYS = 15;
export const AUTH_COOKIES_MAX_AGE = AUTH_COOKIES_DURATION_DAYS * 86400; // in seconds
