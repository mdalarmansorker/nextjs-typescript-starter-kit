/**
 * Base URL of the backend API. Server-only: requests go through `services/api`, never from the browser.
 */
export const API_URL: string = process.env.API_URL || '';

/**
 * You can add other API-related constants here as needed
 * Create module file for api constants like auth_api.ts, user_api.ts, etc., if required in future
 * export them from here for easy access
 * Example:
 * export * from './auth.api'
 * export * from './user.api'
 */

export * from './auth.api';
