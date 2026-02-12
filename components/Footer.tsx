'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import type { Locale } from '../i18n/config';
import type { ShellNavItem } from '@/types/ui-shell';

interface FooterProps {
  locale: Locale;
  user?: unknown;
}

function getSecondaryNav(locale: Locale, base: string, t: (key: string) => string): ShellNavItem[] {
  return [
    { id: 'dashboard', href: `${base}`, label: t('header.nav.dashboard') },
    { id: 'projects', href: `${base}/projects`, label: locale === 'ja' ? 'プロジェクト' : 'Projects' },
    { id: 'records', href: `${base}/records`, label: locale === 'ja' ? '記録' : 'Records' },
    { id: 'chat', href: `${base}/chat`, label: t('header.nav.chat') },
    { id: 'menu', href: `${base}/menu`, label: t('footer.more') },
  ];
}

export default function Footer({ locale, user }: FooterProps) {
  const t = useTranslations();
  const pathname = usePathname();
  const base = `/${locale}`;

  const isAuthPage = pathname?.includes('/login') || pathname?.includes('/signup');
  const isLandingPage = pathname === `/${locale}` || pathname === '/';

  if ((!user && isLandingPage) || isAuthPage) {
    return null;
  }

  const navItems = getSecondaryNav(locale, base, t);

  return (
    <footer role="contentinfo" className="shell-footer mt-10" aria-label="Footer">
      <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-5 border-b border-border/80 pb-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <Image src="/logo.svg" alt={t('header.logo_alt')} width={22} height={22} />
            <span className="text-sm font-semibold text-foreground">{t('header.app_name')}</span>
          </div>

          <nav aria-label="Footer navigation">
            <ul className="flex flex-wrap items-center gap-x-4 gap-y-2">
              {navItems.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    className="text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-4 flex flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {t('header.app_name')}. {t('footer.rights')}
          </p>
          <div className="flex items-center gap-3">
            <Link href={`${base}/terms`} className="hover:text-foreground hover:underline underline-offset-4">
              {t('footer.terms')}
            </Link>
            <span aria-hidden="true">•</span>
            <Link href={`${base}/privacy`} className="hover:text-foreground hover:underline underline-offset-4">
              {t('footer.privacy')}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
