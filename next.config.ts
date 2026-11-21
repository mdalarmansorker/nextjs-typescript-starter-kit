import type { NextConfig } from 'next';

/**
 * Security headers sent with every response. They are safe defaults for any app; a Content-Security-Policy
 * and Strict-Transport-Security depend on your scripts and hosting, so see docs/security.md before adding them.
 */
const securityHeaders = [
  // Don't let browsers guess a different content type than the one sent.
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Don't let other sites put this app in a frame (clickjacking).
  { key: 'X-Frame-Options', value: 'DENY' },
  // Send only the origin to other sites, never full URLs with their query strings.
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Turn off browser features the app doesn't use. Allow them here when a feature needs one.
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()' },
];

const nextConfig: NextConfig = {
  // Don't advertise the framework in an `X-Powered-By` header.
  poweredByHeader: false,

  compiler: {
    // Production builds drop every `console.*` call from app code, on the server and in the browser,
    // including `console.error`. Server errors are then not logged unless `onRequestError` in
    // `instrumentation.ts` sends them to an error tracker. `next dev` and tests keep all output.
    // To keep some output in production, list it: `{ exclude: ['error', 'warn'] }`.
    removeConsole: process.env.NODE_ENV === 'production',
  },

  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
