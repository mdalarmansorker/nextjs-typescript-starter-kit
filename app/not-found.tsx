import type { Metadata } from 'next';

import NotFoundView from '@/views/not-found';

export const metadata: Metadata = {
  title: 'Page not found',
};

/**
 * Shown for unknown URLs and wherever `notFound()` from `next/navigation` is called. Next.js sends a
 * 404 status and a `noindex` robots tag with it.
 */
export default function NotFound() {
  return <NotFoundView />;
}
