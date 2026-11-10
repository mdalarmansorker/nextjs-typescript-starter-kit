import { describe, expect, it } from 'vitest';

import { getErrorMessage, hasProperty } from './helpers';

describe('hasProperty', () => {
  it('is true for an object that has the key', () => {
    expect(hasProperty({ status: 404 }, 'status')).toBe(true);
  });

  it('is true when the key is inherited', () => {
    expect(hasProperty(new Error('boom'), 'message')).toBe(true);
  });

  it.each([null, undefined, 'status', 42, {}])('is false for %p', value => {
    expect(hasProperty(value, 'status')).toBe(false);
  });
});

describe('getErrorMessage', () => {
  it('reads the message of an Error', () => {
    expect(getErrorMessage(new Error('Request failed'))).toBe('Request failed');
  });

  it('reads the message of a plain object', () => {
    expect(getErrorMessage({ message: 'Not found' })).toBe('Not found');
  });

  it('falls back when the message is not a string', () => {
    expect(getErrorMessage({ message: 500 })).toBe('Something went wrong');
  });

  it('uses the given fallback', () => {
    expect(getErrorMessage('oops', 'Try again')).toBe('Try again');
  });
});
