import { Inter, Outfit } from 'next/font/google';
import '../../styles/globals.css';
import { NextIntlClientProvider } from 'next-intl';
import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import getMessages, { locales } from '../../i18n';
import { BottomNav } from '../../components/BottomNav';
// import LanguageSwitcher from '../../components/LanguageSwitcher';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { Providers } from '../../components/Providers';
import { authOptions } from '../../lib/auth-config';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
});

// Generate static params for all supported locales
export function generateStaticParams() {
  return locales.map(locale => ({ locale }));
}

/**
 * Root Layout - Farmer-first navigation
 *
 * Principles (FARMER_UX_VISION.md):
 * - Mobile-first: Bottom navigation in thumb zone
 * - Simplified: Only essential pages
 * - Context-aware: Chat is the main interface
 *
 * Navigation (simplified):
 * Mobile: Bottom nav (今日, 今週, 記録, 知識)
 * Desktop: Minimal top nav (language switcher only)
 */
export default async function RootLayout(props: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  // In Next.js 15, params are async and need to be awaited
  const { children } = props;
  const params = await props.params;
  const locale = params.locale;

  if (!locales.includes(locale)) {
    notFound();
  }

  // Get messages for the locale
  const messages = await getMessages(locale);
  const session = await getServerSession(authOptions);

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <Providers session={session}>
        {/* Full-height layout with mobile optimizations */}
        <div className={`${inter.variable} ${outfit.variable} font-sans mobile-viewport bg-background flex flex-col`} lang={locale}>
          {/* New sticky header */}
          <Header locale={locale as any} user={session?.user as any} />

          {/* Main Content - Full height minus bottom nav on mobile */}
          <main id="main-content" className="flex-1 overflow-auto mobile-scroll safe-bottom pb-20 lg:pb-0">
            {children}
          </main>

          {/* New Footer */}
          <Footer locale={locale as any} user={session?.user} />

          {/* Bottom Navigation - Mobile Only - Enhanced */}
          <div className="mobile-nav-height">
            <BottomNav locale={locale} user={session?.user as any} />
          </div>
        </div>
      </Providers>
    </NextIntlClientProvider>
  );
}
