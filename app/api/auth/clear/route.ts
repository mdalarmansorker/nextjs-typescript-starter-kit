import { type NextRequest, NextResponse } from 'next/server';

import { COOKIE_NAMES } from '@/constants/cookie';

export function GET(request: NextRequest) {
  const url = new URL(request.url);
  const redirectParam = url.searchParams.get('redirect');
  let redirectUrl: URL;

  if (redirectParam) {
    redirectUrl = new URL('/login', url.origin);
    redirectUrl.searchParams.set('redirect', redirectParam);
  } else {
    redirectUrl = new URL('/', url.origin);
  }

  const res = NextResponse.redirect(redirectUrl);

  Object.values(COOKIE_NAMES).forEach(name => {
    res.cookies.delete(name);
  });

  return res;
}
