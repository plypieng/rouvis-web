'use client';

import { useTransition } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Locale } from '../i18n/config';
import { useTranslations } from 'next-intl';

export default function LanguageSwitcher({ locale }: { locale: Locale }) {
  const t = useTranslations('common');
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const switchLocale = (newLocale: Locale) => {
    if (newLocale === locale) return;
    
    // Replace the locale segment in the pathname
    const newPath = pathname.replace(`/${locale}`, `/${newLocale}`);
    
    startTransition(() => {
      router.push(newPath);
    });
  };

  return (
    <div className="flex items-center gap-2 bg-white rounded-lg shadow px-3 py-1.5">
      <span className="text-sm font-medium text-gray-700">{t('language')}:</span>
      <div className="flex rounded-md shadow-sm">
        <button
          onClick={() => switchLocale('en')}
          className={`px-3 py-1 text-sm rounded-l-md ${
            locale === 'en'
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          } ${isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
          disabled={isPending}
        >
          {t('english')}
        </button>
        <button
          onClick={() => switchLocale('ja')}
          className={`px-3 py-1 text-sm rounded-r-md ${
            locale === 'ja'
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          } ${isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
          disabled={isPending}
        >
          {t('japanese')}
        </button>
      </div>
    </div>
  );
}
