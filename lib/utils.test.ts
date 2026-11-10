import { describe, expect, it } from 'vitest';

import { cn } from './utils';

describe('cn', () => {
  it('joins class names and skips falsy ones', () => {
    expect(cn('px-2', false, undefined, 'py-1', { hidden: false, block: true })).toBe('px-2 py-1 block');
  });

  it('lets later Tailwind classes win over conflicting earlier ones', () => {
    expect(cn('px-2 text-sm', 'px-4')).toBe('text-sm px-4');
  });
});
