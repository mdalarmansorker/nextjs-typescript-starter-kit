/** Field name → messages, the shape forms render. */
export type FieldErrors = Record<string, string[]>;

/**
 * A failed API request. Thrown by `handleRequest` for every failure: HTTP errors, network errors,
 * timeouts and responses that don't match the expected shape.
 */
export class ApiError extends Error {
  /** HTTP status from the API, or 400 (refused path), 500 (network), 502 (bad response), 504 (timeout). */
  public status: number;
  /** The API's field errors exactly as it sent them. */
  public errors?: unknown;
  /** `errors` turned into `{ field: ['message'] }` by `toFieldErrors`, for forms. */
  public fieldErrors?: FieldErrors;

  constructor(message: string, status: number, errors?: unknown) {
    super(message);

    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
    this.fieldErrors = toFieldErrors(errors);
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isText = (value: unknown): value is string => typeof value === 'string' && value.trim() !== '';

/**
 * Reads the message and field errors from an API error body. Backends disagree on the shape, so this
 * accepts the common ones:
 *
 * | Shape                                   | Used by                              |
 * | --------------------------------------- | ------------------------------------ |
 * | `{ message, errors }`                   | Laravel, NestJS, many custom APIs    |
 * | `{ error: 'text' }`                     | Express, Rails, Go APIs              |
 * | `{ error: { message, details } }`       | Google-style JSON APIs               |
 * | `{ detail: 'text' }`, `{ detail: [...] }` | Django REST Framework, FastAPI     |
 * | `{ title, detail, errors }`             | RFC 9457 problem details, ASP.NET    |
 *
 * If your API uses another shape, change this function: everything else reads errors through it.
 */
export const readApiError = (body: unknown): { message?: string; errors?: unknown } => {
  if (!isRecord(body)) {
    return {};
  }

  const { message, error, detail, title, errors } = body;
  const nested = isRecord(error) ? error : undefined;

  return {
    message: [message, nested?.message, error, detail, title].find(isText),
    // FastAPI puts validation errors in `detail` as a list.
    errors: errors ?? nested?.details ?? nested?.errors ?? (Array.isArray(detail) ? detail : undefined),
  };
};

/** Turns a path like `['body', 'email']` or `/data/attributes/email` into the field name, `email`. */
const fieldName = (path: unknown): string | undefined => {
  const parts = Array.isArray(path) ? path : typeof path === 'string' ? path.split(/[/.]/) : [];
  const last = parts.filter(part => part !== '' && part !== 'body' && part !== 'query').at(-1);

  return last === undefined ? undefined : String(last);
};

/**
 * Turns field errors into `{ field: ['message'] }`. Accepts:
 *
 * - an object of messages or message lists: `{ email: ['Taken'] }` (Laravel, ASP.NET), `{ email: 'Taken' }`
 * - a list of entries naming the field: `[{ loc: ['body', 'email'], msg }]` (FastAPI),
 *   `[{ path: ['email'], message }]` (zod, Joi), `[{ field, message }]`, `[{ param, msg }]` (express-validator),
 *   `[{ source: { pointer: '/data/attributes/email' }, detail }]` (JSON:API)
 *
 * Returns `undefined` when there are no field errors it understands.
 */
export const toFieldErrors = (errors: unknown): FieldErrors | undefined => {
  const result: FieldErrors = {};

  const add = (field: string | undefined, message: unknown) => {
    if (field && isText(message)) {
      (result[field] ??= []).push(message);
    }
  };

  if (Array.isArray(errors)) {
    for (const entry of errors) {
      if (!isRecord(entry)) continue;

      const source = isRecord(entry.source) ? entry.source.pointer : undefined;
      const field = [entry.field, entry.param].find(isText) ?? fieldName(entry.loc ?? entry.path ?? source);

      add(field, [entry.message, entry.msg, entry.detail].find(isText));
    }
  } else if (isRecord(errors)) {
    for (const [field, messages] of Object.entries(errors)) {
      for (const message of Array.isArray(messages) ? messages : [messages]) {
        add(field, message);
      }
    }
  }

  return Object.keys(result).length > 0 ? result : undefined;
};
