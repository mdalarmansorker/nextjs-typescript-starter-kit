import Link from 'next/link';

import type { Metadata } from 'next';

import { buttonVariants } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Page not found',
};

/**
 * Shown for unknown URLs and wherever `notFound()` from `next/navigation` is called.
 */
export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="text-muted-foreground">The page you are looking for doesn&apos;t exist or has moved.</p>
      <Link href="/" className={buttonVariants({ variant: 'link' })}>
        Go home
      </Link>
    </main>
  );
}
