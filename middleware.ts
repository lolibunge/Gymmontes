import { NextResponse, type NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const has = req.cookies.has('gm_session');
  const { pathname } = req.nextUrl;
  if (!has && pathname !== '/login') {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.search = pathname === '/' ? '' : `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next|icons|logo.jpg|sw.js|manifest.webmanifest|favicon.ico).*)'],
};
