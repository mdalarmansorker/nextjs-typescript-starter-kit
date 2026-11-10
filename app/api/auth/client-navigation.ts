import { NextResponse } from 'next/server';

/**
 * True when Next.js's client router requested this URL (a `<Link>` click, `router.push`, or a
 * `redirect()` during one), instead of the browser loading it as a page.
 *
 * Route handlers that redirect back to a page answer these with `fullPageLoad()`: the client router
 * can't follow such a redirect chain and would keep re-navigating without rendering.
 */
export const isClientNavigation = (request: Request): boolean =>
  request.headers.get('rsc') === '1' || new URL(request.url).searchParams.has('_rsc');

/** A response that isn't a page payload, so the client router loads the requested URL as a full page. */
export const fullPageLoad = (): NextResponse => new NextResponse(null, { status: 204 });
