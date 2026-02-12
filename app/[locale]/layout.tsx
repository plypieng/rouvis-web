import { JetBrains_Mono, Shippori_Mincho_B1, Zen_Kaku_Gothic_New } from 'next/font/google';
import '../../styles/globals.css';
import { NextIntlClientProvider } from 'next-intl';
import { notFound } from 'next/navigation';
import { getMessages } from 'next-intl/server';
import { locales } from '../../i18n';
import { BottomNav } from '../../components/BottomNav';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { Providers } from '../../components/Providers';
import FeedbackButton from '../../components/FeedbackButton';
import OnboardingTour from '../../components/OnboardingTour';
import AlertToastBridge from '../../components/AlertToastBridge';
import { getServerSessionFromToken } from '../../lib/server-auth';
import type { Locale } from '../../i18n/config';
import type { AppShellProps } from '@/types/ui-shell';

const zenKaku = Zen_Kaku_Gothic_New({
  subsets: ['latin'],
  weight: ['400', '500', '700', '900'],
  variable: '--font-zen-kaku',
  display: 'swap',
});

const shippori = Shippori_Mincho_B1({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-shippori',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
});

export default async function RootLayout(props: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { children } = props;
  const params = await props.params;
  const locale = params.locale;

  if (!locales.includes(locale)) {
    notFound();
  }

  const messages = await getMessages();
  const session = await getServerSessionFromToken();

  const typedLocale = locale as Locale;
  const isAuthenticated = Boolean(session?.user?.id);
  const onboardingComplete = Boolean(
    (session?.user as { onboardingComplete?: boolean } | undefined)?.onboardingComplete
  );
  const isOnboardingIncompleteUser = isAuthenticated && !onboardingComplete;
  const headerUser = session?.user
    ? {
        name: session.user.name ?? undefined,
        email: session.user.email ?? undefined,
        avatarUrl: (session.user as { image?: string | null }).image ?? undefined,
      }
    : null;

  const shellProps: AppShellProps = {
    locale,
    isAuthenticated,
    isOnboardingIncomplete: isOnboardingIncompleteUser,
  };

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <Providers session={session}>
        <div
          className={`${zenKaku.variable} ${shippori.variable} ${jetbrainsMono.variable} shell-canvas mobile-viewport flex min-h-screen flex-col font-sans`}
          lang={locale}
          data-authenticated={shellProps.isAuthenticated ? 'true' : 'false'}
        >
          {!isOnboardingIncompleteUser && <Header locale={typedLocale} user={headerUser} />}

          <main
            id="main-content"
            className={`shell-main flex-1 overflow-auto mobile-scroll safe-bottom ${
              isOnboardingIncompleteUser ? 'pb-0' : 'pb-28 lg:pb-6'
            }`}
          >
            {children}
          </main>

          {!isOnboardingIncompleteUser && <Footer locale={typedLocale} user={session?.user} />}
          {!isOnboardingIncompleteUser && session?.user && <FeedbackButton />}
          {!isOnboardingIncompleteUser && session?.user && <OnboardingTour />}

          {!isOnboardingIncompleteUser && (
            <div className="mobile-nav-height lg:hidden">
              <BottomNav locale={typedLocale} user={session?.user} />
            </div>
          )}

          <AlertToastBridge />
        </div>
      </Providers>
    </NextIntlClientProvider>
  );
}
