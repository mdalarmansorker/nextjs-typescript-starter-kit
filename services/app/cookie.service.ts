import Cookies from 'js-cookie'

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
    return typeof window === 'undefined'
  }

  /**
   * Gets the Next.js cookies store (server-side only)
   */
  private static async getServerCookies() {
    if (!this.isServer()) return null
    const { cookies } = await import('next/headers')

    return cookies()
  }

  /**
   * Stores a cookie with the given name, value, and options.
   * @param name The name of the cookie.
   * @param value The value to store.
   * @param options Optional cookie options (expires, path, etc.).
   */
  static async store(name: string, value: string, options?: Cookies.CookieAttributes): Promise<void> {
    if (this.isServer()) {
      const cookieStore = await this.getServerCookies()

      if (cookieStore) {
        const serverOptions: any = {}

        if (options?.expires) {
          serverOptions.maxAge = typeof options.expires === 'number' ? options.expires * 86400 : undefined
        }

        if (options?.path) serverOptions.path = options.path
        if (options?.domain) serverOptions.domain = options.domain
        if (options?.secure) serverOptions.secure = options.secure
        if (options?.sameSite) serverOptions.sameSite = options.sameSite

        cookieStore.set(name, value, serverOptions)
      }
    } else {
      Cookies.set(name, value, options)
    }
  }

  /**
   * Retrieves the value of a cookie by name.
   * @param name The name of the cookie.
   * @returns The cookie value or undefined if not found.
   */
  static async get(name: string): Promise<string | undefined> {
    if (this.isServer()) {
      const cookieStore = await this.getServerCookies()

      return cookieStore?.get(name)?.value
    } else {
      return Cookies.get(name)
    }
  }

  /**
   * Updates an existing cookie by overwriting its value and options.
   * @param name The name of the cookie.
   * @param value The new value to store.
   * @param options Optional cookie options (expires, path, etc.).
   */
  static async update(name: string, value: string, options?: Cookies.CookieAttributes): Promise<void> {
    await this.store(name, value, options)
  }

  /**
   * Deletes a specific cookie by name.
   * @param name The name of the cookie to delete.
   * @param options Optional cookie options (path, domain, etc.).
   */
  static async delete(name: string, options?: Cookies.CookieAttributes): Promise<void> {
    if (this.isServer()) {
      const cookieStore = await this.getServerCookies()

      if (cookieStore) {
        const serverOptions: any = {}

        if (options?.path) serverOptions.path = options.path
        if (options?.domain) serverOptions.domain = options.domain

        cookieStore.delete(name)
      }
    } else {
      Cookies.remove(name, options)
    }
  }

  /**
   * Clears all cookies accessible from the current location.
   * Note: Only works on client-side. Server-side requires explicit cookie names.
   */
  static async clear(): Promise<void> {
    if (this.isServer()) {
      const cookieStore = await this.getServerCookies()

      if (cookieStore) {
        const allCookies = cookieStore.getAll()

        allCookies.forEach(cookie => {
          cookieStore.delete(cookie.name)
        })
      }
    } else {
      const allCookies = Cookies.get()

      Object.keys(allCookies).forEach(cookieName => {
        Cookies.remove(cookieName)
      })
    }
  }

  /**
   * Synchronous versions for client-side only (backwards compatibility)
   * These will throw an error if called on the server
   */
  static storeSync(name: string, value: string, options?: Cookies.CookieAttributes): void {
    if (this.isServer()) {
      throw new Error('storeSync cannot be used on server-side. Use store() instead.')
    }

    Cookies.set(name, value, options)
  }

  static getSync(name: string): string | undefined {
    if (this.isServer()) {
      throw new Error('getSync cannot be used on server-side. Use get() instead.')
    }

    return Cookies.get(name)
  }

  static deleteSync(name: string, options?: Cookies.CookieAttributes): void {
    if (this.isServer()) {
      throw new Error('deleteSync cannot be used on server-side. Use delete() instead.')
    }

    Cookies.remove(name, options)
  }

  static clearSync(): void {
    if (this.isServer()) {
      throw new Error('clearSync cannot be used on server-side. Use clear() instead.')
    }

    const allCookies = Cookies.get()

    Object.keys(allCookies).forEach(cookieName => {
      Cookies.remove(cookieName)
    })
  }
}
