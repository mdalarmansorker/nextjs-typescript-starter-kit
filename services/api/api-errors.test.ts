import { describe, expect, it } from 'vitest';

import { ApiError, readApiError, toFieldErrors } from './api-errors';

describe('readApiError', () => {
  it.each([
    ['{ message, errors }', { message: 'Invalid', errors: { email: ['Taken'] } }, 'Invalid', { email: ['Taken'] }],
    ['{ error: text }', { error: 'Not allowed' }, 'Not allowed', undefined],
    [
      '{ error: { message, details } }',
      { error: { message: 'Bad input', details: [{ field: 'name', message: 'Required' }] } },
      'Bad input',
      [{ field: 'name', message: 'Required' }],
    ],
    ['{ detail: text }', { detail: 'Not found.' }, 'Not found.', undefined],
    [
      'FastAPI validation',
      { detail: [{ loc: ['body', 'email'], msg: 'field required' }] },
      undefined,
      [{ loc: ['body', 'email'], msg: 'field required' }],
    ],
    [
      'RFC 9457 problem details',
      { title: 'Validation failed', detail: 'The email is taken.', errors: { email: ['Taken'] } },
      'The email is taken.',
      { email: ['Taken'] },
    ],
    ['{ title } only', { title: 'Forbidden' }, 'Forbidden', undefined],
  ])('reads %s', (_name, body, message, errors) => {
    expect(readApiError(body)).toEqual({ message, errors });
  });

  it.each([null, 'Internal Server Error', [1, 2], 42])('returns nothing for %j', body => {
    expect(readApiError(body)).toEqual({});
  });

  it('skips empty messages', () => {
    expect(readApiError({ message: '  ', error: 'Real message' }).message).toBe('Real message');
  });
});

describe('toFieldErrors', () => {
  it.each([
    ['message lists (Laravel, ASP.NET)', { email: ['Taken', 'Invalid'] }, { email: ['Taken', 'Invalid'] }],
    ['single messages', { email: 'Taken' }, { email: ['Taken'] }],
    ['FastAPI', [{ loc: ['body', 'email'], msg: 'field required' }], { email: ['field required'] }],
    ['zod / Joi', [{ path: ['user', 'name'], message: 'Required' }], { name: ['Required'] }],
    ['{ field, message }', [{ field: 'email', message: 'Taken' }], { email: ['Taken'] }],
    ['express-validator', [{ param: 'age', msg: 'Must be a number' }], { age: ['Must be a number'] }],
    ['JSON:API', [{ source: { pointer: '/data/attributes/email' }, detail: 'Taken' }], { email: ['Taken'] }],
  ])('reads %s', (_name, errors, expected) => {
    expect(toFieldErrors(errors)).toEqual(expected);
  });

  it('groups several messages for one field', () => {
    expect(
      toFieldErrors([
        { field: 'email', message: 'Taken' },
        { field: 'email', message: 'Invalid' },
      ]),
    ).toEqual({ email: ['Taken', 'Invalid'] });
  });

  it.each([undefined, null, 'text', {}, [], [{ message: 'no field' }], { token: 42 }])(
    'returns undefined for %j',
    errors => {
      expect(toFieldErrors(errors)).toBeUndefined();
    },
  );
});

describe('ApiError', () => {
  it('keeps the raw errors and adds field errors', () => {
    const error = new ApiError('Invalid', 422, [{ field: 'email', message: 'Taken' }]);

    expect(error).toMatchObject({
      name: 'ApiError',
      status: 422,
      errors: [{ field: 'email', message: 'Taken' }],
      fieldErrors: { email: ['Taken'] },
    });
  });
});
