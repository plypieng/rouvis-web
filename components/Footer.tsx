'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Locale } from '../i18n/config';

import { usePathname } from 'next/navigation';

interface FooterProps {
  locale: Locale;
  user?: any;
}

export default function Footer({ locale, user }: FooterProps) {
  const t = useTranslations();
  const pathname = usePathname();
  const base = `/${locale}`;

  // Hide global footer on landing page for unauthenticated users
  // Landing page path is usually `/${locale}` or just `/`
  const isLandingPage = pathname === `/${locale}` || pathname === '/';
  if (!user && isLandingPage) {
    return null;
  }

  return (
    <footer
      role="contentinfo"
      className="mt-8 border-t border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-gray-900/70 backdrop-blur"
      aria-label="Footer"
    >
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          {/* Brand */}
          <div className="flex items-center gap-2">
            <Image src="/logo.svg" alt={t('header.logo_alt')} width={24} height={24} />
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-50">
              {t('header.app_name')}
            </span>
          </div>

          {/* Footer nav */}
          <nav aria-label="Footer navigation">
            <ul className="flex flex-wrap items-center gap-3 sm:gap-4">
              <li>
                <Link
                  href={`${base}/about`}
                  className="text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white underline-offset-4 hover:underline focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-600 rounded"
                >
                  {t('footer.about')}
                </Link>
              </li>
              <li>
                <Link
                  href={`${base}/explore`}
                  className="text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white underline-offset-4 hover:underline focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-600 rounded"
                >
                  {t('footer.explore')}
                </Link>
              </li>
              <li>
                <Link
                  href={`${base}/help`}
                  className="text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white underline-offset-4 hover:underline focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-600 rounded"
                >
                  {t('footer.help')}
                </Link>
              </li>
              <li>
                {/* TODO: replace with actual destination or a page aggregating secondary links */}
                <Link
                  href={`${base}/more`}
                  className="text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white underline-offset-4 hover:underline focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-600 rounded"
                >
                  {t('footer.more')}
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        {/* Bottom meta row */}
        <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-xs text-gray-600 dark:text-gray-400">
            © {new Date().getFullYear()} {t('header.app_name')}. {t('footer.rights')}
          </p>
          <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400">
            <Link
              href={`${base}/terms`}
              className="hover:text-gray-900 dark:hover:text-white underline-offset-4 hover:underline"
            >
              {t('footer.terms')}
            </Link>
            <span aria-hidden="true">•</span>
            <Link
              href={`${base}/privacy`}
              className="hover:text-gray-900 dark:hover:text-white underline-offset-4 hover:underline"
            >
              {t('footer.privacy')}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}