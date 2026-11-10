'use client';

// TEST SETUP (academy backend): delete this file before committing.

import { useActionState } from 'react';

import { checkProfileAction } from './test-profile';

export default function TestProfileCheck() {
  const [result, action, pending] = useActionState(checkProfileAction, '');

  return (
    <form action={action} className="flex items-center gap-3">
      <button type="submit" disabled={pending} className="rounded border border-border px-3 py-1">
        Load profile via server action
      </button>
      <output>{result}</output>
    </form>
  );
}
