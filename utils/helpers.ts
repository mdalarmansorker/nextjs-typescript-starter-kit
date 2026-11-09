/**
 * Narrows an unknown value to an object that has the given key.
 */
export function hasProperty<K extends PropertyKey>(value: unknown, key: K): value is Record<K, unknown> {
  return typeof value === 'object' && value !== null && key in value;
}

/**
 * Reads the message of an unknown error, or returns the fallback when it has none.
 */
export function getErrorMessage(error: unknown, fallback: string = 'Something went wrong'): string {
  return hasProperty(error, 'message') && typeof error.message === 'string' ? error.message : fallback;
}
