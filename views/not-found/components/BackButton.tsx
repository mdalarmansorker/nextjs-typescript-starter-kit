'use client';

import { useRouter } from 'next/navigation';

/**
 * Returns to the previous page. Visitors who opened the missing URL directly have no history in this
 * tab, so they go home instead of leaving the site.
 */
export default function BackButton() {
  const router = useRouter();

  function goBack() {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push('/');
    }
  }

  return (
    <button
      type="button"
      onClick={goBack}
      className="rounded-full border border-zinc-300 px-5 py-2 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
    >
      Go back
    </button>
  );
}
