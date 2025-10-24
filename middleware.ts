import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { locales, defaultLocale } from './i18n';
import { getToken } from 'next-auth/jwt';

// Create the middleware
const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localeDetection: true,
  // Set to 'always' to prevent the redirect loop
  localePrefix: 'always'
});

// Public routes that don't require authentication
const publicRoutes = ['/login', '/api/auth'];

// Export a custom middleware function to handle auth + i18n
export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for API routes, static files, etc.
  const publicPatterns = [/\/api\//i, /\/_next\//i, /\.\w+$/i];
  if (publicPatterns.some(pattern => pattern.test(pathname))) {
    return;
  }

  // Handle the root path specially - redirect to default locale
  if (pathname === '/') {
    return NextResponse.redirect(new URL(`/${defaultLocale}`, request.url));
  }

  // Check authentication
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  // Extract the path without locale prefix for route checking
  const pathWithoutLocale = pathname.replace(/^\/(ja|en)/, '');
  const isPublicRoute = publicRoutes.some(route => pathWithoutLocale.startsWith(route));

  // Redirect to login if not authenticated and trying to access protected route
  if (!token && !isPublicRoute) {
    const loginUrl = new URL(`/${defaultLocale}/login`, request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect away from login if already authenticated
  if (token && pathWithoutLocale.startsWith('/login')) {
    return NextResponse.redirect(new URL(`/${defaultLocale}/calendar`, request.url));
  }

  // Use next-intl middleware for all other paths
  return intlMiddleware(request);
}

export const config = {
  // Apply middleware to all paths except static files, api routes, etc.
  matcher: ['/((?!api|_next|.*\\..*).*)'] 
};
