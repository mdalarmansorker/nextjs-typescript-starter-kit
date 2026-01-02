import CryptoJS from 'crypto-js'

const SECRET_KEY: string | undefined = process.env.NEXT_PUBLIC_ENCRYPTION_KEY

if (!SECRET_KEY) {
  throw new Error('NEXT_PUBLIC_ENCRYPTION_KEY is not defined in environment variables.')
}

const NODE_ENV: string = process.env.NODE_ENV || 'production'

/**
 * Encrypts data using AES encryption.
 * In development, returns the data as-is.
 * In production, returns the encrypted string.
 * @param data - The data to encrypt (object, array, or string).
 * @returns The encrypted string or original data in development.
 */
export const encryptData = (data: any): string | any => {
  try {
    if (NODE_ENV === 'development') {
      return data
    } else if (NODE_ENV === 'production') {
      const jsonData = JSON.stringify(data)

      return CryptoJS.AES.encrypt(jsonData, SECRET_KEY).toString()
    } else {
      console.warn('NODE_ENV is not set correctly. Defaulting to JSON.stringify.')

      return JSON.stringify(data)
    }
  } catch (error) {
    console.error('Encryption error:', error)

    return null
  }
}

/**
 * Decrypts AES-encrypted data.
 * In development, attempts to parse JSON or returns the value as-is.
 * In production, decrypts and parses the data.
 * @param value - The encrypted string or object.
 * @returns The decrypted data or original value if decryption fails.
 */
export const decryptData = (value: any): any => {
  try {
    if (!value) {
      return null
    }

    if (NODE_ENV === 'development') {
      if (typeof value === 'object' && value !== null) return value

      if (typeof value === 'string') {
        try {
          return JSON.parse(value)
        } catch {
          return value
        }
      }

      return value
    } else if (NODE_ENV === 'production') {
      if (typeof value === 'object' && value !== null) {
        return value
      }

      if (typeof value !== 'string') {
        return value
      }

      try {
        const parsed = JSON.parse(value)

        return parsed
      } catch {
        // Not valid JSON, continue with decryption
      }

      try {
        const decryptedBytes = CryptoJS.AES.decrypt(value, SECRET_KEY)

        if (!decryptedBytes || !decryptedBytes.words || decryptedBytes.words.length === 0) {
          return value
        }

        let decrypted: string

        try {
          decrypted = decryptedBytes.toString(CryptoJS.enc.Utf8)
        } catch {
          return value
        }

        if (!decrypted || decrypted.trim() === '') {
          return value
        }

        try {
          const parsed = JSON.parse(decrypted)

          return parsed
        } catch {
          return decrypted
        }
      } catch {
        return value
      }
    } else {
      return value
    }
  } catch {
    return value
  }
}

/**
 * Safely decrypts user data, returning null if decryption fails.
 * @param encryptedData - The encrypted user data.
 * @returns The decrypted user data or null.
 */
export const decryptUserData = (encryptedData: unknown): unknown | null => {
  try {
    const decrypted = decryptData(encryptedData)

    if (!decrypted) {
      return null
    }

    return decrypted
  } catch {
    return encryptedData
  }
}

/**
 * Encrypts a URL for safe redirection.
 * @param url - The URL to encrypt.
 * @returns The encrypted and URL-safe string.
 */
export const encryptRedirectUrl = (url: string): string | null => {
  try {
    const encrypted = CryptoJS.AES.encrypt(url, SECRET_KEY).toString()

    return encrypted.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  } catch (error) {
    console.error('URL Encryption error:', error)

    return null
  }
}

/**
 * Decrypts a URL that was encrypted for redirection.
 * @param encryptedUrl - The encrypted URL string.
 * @returns The decrypted URL or null if decryption fails.
 */
export const decryptRedirectUrl = (encryptedUrl: string): string | null => {
  try {
    let restored = encryptedUrl.replace(/-/g, '+').replace(/_/g, '/')

    while (restored.length % 4) {
      restored += '='
    }

    const decrypted = CryptoJS.AES.decrypt(restored, SECRET_KEY).toString(CryptoJS.enc.Utf8)

    return decrypted
  } catch (error) {
    console.error('URL Decryption error:', error)

    return null
  }
}
