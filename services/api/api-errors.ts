export class ApiError extends Error {
  public status: number;
  public errors?: unknown;

  constructor(message: string, status: number, errors?: unknown) {
    super(message);

    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
  }
}
