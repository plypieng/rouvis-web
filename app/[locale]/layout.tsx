import { Inter } from 'next/font/google';
import '../../styles/globals.css';
import { NextIntlClientProvider } from 'next-intl';
import { notFound } from 'next/navigation';
import getMessages, { locales } from '../../i18n';
import { BottomNav } from '../../components/BottomNav';
import LanguageSwitcher from '../../components/LanguageSwitcher';

const inter = Inter({ subsets: ['latin'] });

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

  return (
    <html lang={locale}>
      <body className={inter.className}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          {/* Full-height layout with padding for bottom nav on mobile */}
          <div className="h-screen bg-gray-50 flex flex-col">
            {/* Top Bar - Language Switcher */}
            <div className="absolute top-4 right-4 z-40">
              <LanguageSwitcher locale={locale} />
            </div>

            {/* Main Content - Full height minus bottom nav on mobile */}
            <main className="flex-1 overflow-auto pb-20 lg:pb-0">
              {children}
            </main>

            {/* Bottom Navigation - Mobile Only */}
            <BottomNav locale={locale} />
          </div>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
