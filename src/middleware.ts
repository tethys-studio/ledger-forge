import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Convenience aliases for fintech modules
  if (pathname === '/ledger') {
    return NextResponse.redirect(new URL('/transactions', request.url));
  }
  if (pathname === '/pipeline') {
    return NextResponse.redirect(new URL('/income', request.url));
  }
  if (pathname === '/udhaar') {
    return NextResponse.redirect(new URL('/debts', request.url));
  }
  if (pathname === '/sinking-funds') {
    return NextResponse.redirect(new URL('/subscriptions', request.url));
  }

  // Check for presence of Better Auth session token cookie
  const sessionToken =
    request.cookies.get('better-auth.session_token') ||
    request.cookies.get('__Secure-better-auth.session_token');

  const isAuthenticated = Boolean(sessionToken?.value);
  const isAuthPage = pathname === '/login' || pathname === '/signup';

  // 1. Authenticated users should not revisit login or signup
  if (isAuthenticated && isAuthPage) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // 2. Unauthenticated visitors are redirected to /login
  if (!isAuthenticated && !isAuthPage) {
    const loginUrl = new URL('/login', request.url);
    if (pathname !== '/' && !pathname.startsWith('/api/')) {
      loginUrl.searchParams.set('callbackUrl', pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api/auth (Better Auth endpoints)
     * - api/cron (background cron jobs)
     * - api/calendar (RFC 5545 calendar subscriptions for Google/Apple Calendar)
     * - _next/static (static asset bundles)
     * - _next/image (image optimization endpoints)
     * - favicon.ico, static media formats
     */
    '/((?!api/auth|api/cron|api/calendar|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
