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
const publicRoutes = ['/login', '/signup', '/api/auth'];

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

  const localeMatch = pathname.match(/^\/(ja|en)(\/|$)/);
  const locale = localeMatch?.[1] ?? defaultLocale;

  // Extract the path without locale prefix for route checking
  let pathWithoutLocale = pathname.replace(/^\/(ja|en)/, '');
  if (pathWithoutLocale === '') pathWithoutLocale = '/';

  const isPublicRoute = publicRoutes.some(route => pathWithoutLocale.startsWith(route)) || pathWithoutLocale === '/';

  // For public routes that already have a locale prefix, just proceed without redirect
  // This prevents next-intl from interfering with client-side navigation (RSC requests)
  if (isPublicRoute && localeMatch) {
    return NextResponse.next();
  }

  // For public routes without locale, use intl middleware to add locale
  if (isPublicRoute) {
    return intlMiddleware(request as any);
  }

  // Check authentication only for protected routes
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });
  const userId =
    (typeof (token as any)?.id === 'string' && (token as any).id) ||
    (typeof token?.sub === 'string' && token.sub) ||
    null;
  const isAuthenticated = Boolean(userId);

  // Redirect to login if not authenticated and trying to access protected route
  if (!isAuthenticated) {
    const loginUrl = new URL(`/${locale}/login`, request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Soft onboarding enforcement for new users
  // Check if user has completed onboarding (has UserProfile)
  const onboardingComplete = (token as any)?.onboardingComplete;
  const isOnboardingRoute = pathWithoutLocale.startsWith('/onboarding');

  // If user hasn't completed onboarding and is trying to access main app routes,
  // redirect them to onboarding (soft enforcement - only for dashboard)
  if (!onboardingComplete && !isOnboardingRoute) {
    // Only redirect from the main dashboard route, not for all routes
    // This is "soft" enforcement - they can still access other pages
    if (pathWithoutLocale === '/' || pathWithoutLocale === '/projects') {
      const onboardingUrl = new URL(`/${locale}/onboarding`, request.url);
      return NextResponse.redirect(onboardingUrl);
    }
  }

  // For authenticated users on protected routes that already have a locale prefix,
  // bypass intlMiddleware to prevent redirect loops during client-side navigation
  if (localeMatch) {
    return NextResponse.next();
  }

  // Only use intlMiddleware for authenticated users on routes without locale prefix
  return intlMiddleware(request as any);
}

export const config = {
  // Apply middleware to all paths except static files, api routes, etc.
  matcher: ['/((?!api|_next|.*\\..*).*)']
};
