/**
 * A failed API request. Thrown by `handleRequest` for every failure: HTTP errors, network errors,
 * timeouts and responses that don't match the expected shape.
 */
export class ApiError extends Error {
  /** HTTP status from the API, or 400 (refused path), 500 (network), 502 (bad response), 504 (timeout). */
  public status: number;
  /** Field errors from the API, e.g. Laravel's `{ email: ['The email has already been taken.'] }`. */
  public errors?: unknown;

  constructor(message: string, status: number, errors?: unknown) {
    super(message);

    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
  }
}
