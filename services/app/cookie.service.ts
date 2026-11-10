import Cookies from 'js-cookie';

import { COOKIE_NAMES } from '@/constants/cookie';

const AUTH_COOKIE_NAMES: readonly string[] = Object.values(COOKIE_NAMES);

interface ServerCookieOptions {
  expires?: Date;
  maxAge?: number;
  path?: string;
  domain?: string;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
}

/**
 * CookieService provides static methods to manage browser cookies.
 * Automatically detects server-side vs client-side and uses appropriate method.
 * - Server-side: Uses Next.js cookies() from 'next/headers'
 * - Client-side: Uses js-cookie
 */
export default class CookieService {
  /**
   * Checks if code is running on the server
   */
  private static isServer(): boolean {
    return typeof window === 'undefined';
  }

  /**
   * Gets the Next.js cookies store (server-side only)
   */
  private static async getServerCookies() {
    if (!this.isServer()) return null;
    const { cookies } = await import('next/headers');

    return cookies();
  }

  /**
   * Maps js-cookie options to the shape Next.js cookies() expects
   */
  private static getServerOptions(options?: Cookies.CookieAttributes): ServerCookieOptions {
    if (!options) return {};

    const serverOptions: ServerCookieOptions = {
      ...(options.path && { path: options.path }),
      ...(options.domain && { domain: options.domain }),
      ...(options.secure !== undefined && { secure: options.secure }),
      ...(options.httpOnly !== undefined && { httpOnly: options.httpOnly }),
      ...(options.sameSite && { sameSite: options.sameSite.toLowerCase() as ServerCookieOptions['sameSite'] }),
    };

    if (typeof options.expires === 'number') {
      serverOptions.maxAge = options.expires * 86400;
    } else if (options.expires instanceof Date) {
      serverOptions.expires = options.expires;
    }

    return serverOptions;
  }

  /**
   * Stores a cookie with the given name, value, and options.
   * @param name The name of the cookie.
   * @param value The value to store.
   * @param options Optional cookie options (expires, path, etc.).
   */
  static async store(name: string, value: string, options?: Cookies.CookieAttributes): Promise<void> {
    if (this.isServer()) {
      const cookieStore = await this.getServerCookies();

      if (cookieStore) {
        cookieStore.set(name, value, this.getServerOptions(options));
      }
    } else {
      Cookies.set(name, value, options);
    }
  }

  /**
   * Retrieves the value of a cookie by name.
   * @param name The name of the cookie.
   * @returns The cookie value or undefined if not found.
   */
  static async get(name: string): Promise<string | undefined> {
    if (this.isServer()) {
      const cookieStore = await this.getServerCookies();

      return cookieStore?.get(name)?.value;
    } else {
      return Cookies.get(name);
    }
  }

  /**
   * Updates an existing cookie by overwriting its value and options.
   * @param name The name of the cookie.
   * @param value The new value to store.
   * @param options Optional cookie options (expires, path, etc.).
   */
  static async update(name: string, value: string, options?: Cookies.CookieAttributes): Promise<void> {
    await this.store(name, value, options);
  }

  /**
   * Deletes a specific cookie by name.
   * @param name The name of the cookie to delete.
   * @param options Optional cookie options (path, domain, etc.).
   */
  static async delete(name: string, options?: Cookies.CookieAttributes): Promise<void> {
    if (this.isServer()) {
      const cookieStore = await this.getServerCookies();

      if (cookieStore) {
        cookieStore.delete({ name, path: options?.path, domain: options?.domain });
      }
    } else {
      Cookies.remove(name, options);
    }
  }

  /**
   * Deletes the given cookies; by default the app's auth cookies (`COOKIE_NAMES`).
   *
   * Only cookies this app owns are deleted, never every cookie, so consent, analytics and theme cookies
   * survive a logout. In the browser, `httpOnly` cookies (like the access token) can't be deleted: end a
   * session through `/api/auth/clear` instead.
   * @param names The cookies to delete.
   * @param options Optional cookie options (path, domain) the cookies were set with.
   */
  static async clear(names: readonly string[] = AUTH_COOKIE_NAMES, options?: Cookies.CookieAttributes): Promise<void> {
    for (const name of names) {
      await this.delete(name, options);
    }
  }

  /**
   * Synchronous versions for client-side only (backwards compatibility)
   * These will throw an error if called on the server
   */
  static storeSync(name: string, value: string, options?: Cookies.CookieAttributes): void {
    if (this.isServer()) {
      throw new Error('storeSync cannot be used on server-side. Use store() instead.');
    }

    Cookies.set(name, value, options);
  }

  static getSync(name: string): string | undefined {
    if (this.isServer()) {
      throw new Error('getSync cannot be used on server-side. Use get() instead.');
    }

    return Cookies.get(name);
  }

  static deleteSync(name: string, options?: Cookies.CookieAttributes): void {
    if (this.isServer()) {
      throw new Error('deleteSync cannot be used on server-side. Use delete() instead.');
    }

    Cookies.remove(name, options);
  }

  static clearSync(names: readonly string[] = AUTH_COOKIE_NAMES, options?: Cookies.CookieAttributes): void {
    if (this.isServer()) {
      throw new Error('clearSync cannot be used on server-side. Use clear() instead.');
    }

    for (const name of names) {
      Cookies.remove(name, options);
    }
  }
}
