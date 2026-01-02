export const API_URL: string = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'

/**
 * You can add other API-related constants here as needed
 * Create module file for api constants like auth_api.ts, user_api.ts, etc., if required in future
 * export them from here for easy access
 * Example:
 * export * from './auth.api'
 * export * from './user.api'
 */

export * from './auth.api'
