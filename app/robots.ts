import type { MetadataRoute } from 'next';

import { PROTECTED_ROUTES } from '@/constants/routes';

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

/** Served at /robots.txt. Keeps crawlers out of the API and pages behind login. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', ...PROTECTED_ROUTES],
    },
    sitemap: new URL('/sitemap.xml', appUrl).href,
  };
}
