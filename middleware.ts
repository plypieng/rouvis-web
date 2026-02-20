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
const publicRoutes = ['/login', '/signup', '/api/auth', '/privacy', '/terms'];
const onboardingSafeRoutes = ['/onboarding', '/projects/create'];

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

  const isPublicRoute = publicRoutes.some(route => pathWithoutLocale.startsWith(route));
  const isLandingRoute = pathWithoutLocale === '/';

  // For public routes that already have a locale prefix, just proceed without redirect
  // This prevents next-intl from interfering with client-side navigation (RSC requests)
  if (isPublicRoute && localeMatch) {
    return NextResponse.next();
  }

  // For public routes without locale, use intl middleware to add locale
  if (isPublicRoute) {
    return intlMiddleware(request as any);
  }

  // Check authentication for protected routes and authenticated landing behavior
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });
  const userId =
    (typeof (token as any)?.id === 'string' && (token as any).id) ||
    (typeof token?.sub === 'string' && token.sub) ||
    null;
  const isAuthenticated = Boolean(userId);

  // Keep locale landing page public for signed-out users.
  if (!isAuthenticated && isLandingRoute) {
    if (localeMatch) {
      return NextResponse.next();
    }
    return intlMiddleware(request as any);
  }

  // Redirect to login if not authenticated and trying to access protected route
  if (!isAuthenticated) {
    const loginUrl = new URL(`/${locale}/login`, request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Onboarding enforcement for new users
  // Claims are computed in auth callbacks. Default to false if missing to ensure security,
  // but we fail-open if profileComplete is true to prevent stale-claim lockouts.
  const profileComplete = Boolean((token as any)?.profileComplete);
  const onboardingComplete = Boolean((token as any)?.onboardingComplete);
  const isProjectCreateRoute = pathWithoutLocale.startsWith('/projects/create');
  const isOnboardingRoute = onboardingSafeRoutes.some((route) => pathWithoutLocale.startsWith(route));

  // If user hasn't completed profile setup, keep them on onboarding flow.
  // Fail-open safeguard: once profile is complete, avoid hard redirects
  // based solely on onboardingComplete claim to reduce stale-claim lockouts.
  if (!profileComplete && !onboardingComplete) {
    if (!isOnboardingRoute) {
      const onboardingUrl = new URL(`/${locale}/onboarding`, request.url);
      onboardingUrl.searchParams.set('reason', 'onboarding_required');
      onboardingUrl.searchParams.set('from', pathWithoutLocale);
      onboardingUrl.searchParams.set('nextStep', 'profile');
      return NextResponse.redirect(onboardingUrl);
    }
  }

  // If profile is complete but onboarding (fields/projects) is not, 
  // we only redirect to onboarding if they aren't already on an onboarding-safe route.
  // We allow access to project creation as it's part of the funnel.
  if (profileComplete && !onboardingComplete && !isOnboardingRoute && !isProjectCreateRoute) {
    // Optional: could redirect to 'field' step of onboarding
    // For now, let's be more lenient to avoid the bug reported by the user
    // if (!isOnboardingRoute) { ... }
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
