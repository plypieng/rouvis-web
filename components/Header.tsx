'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Locale } from '../i18n/config';
import LanguageSwitcher from './LanguageSwitcher';

type ThemeMode = 'light' | 'dark' | 'system';

interface HeaderProps {
  locale: Locale;
  // Placeholder for future auth integration (e.g. next-auth)
  user?: {
    name?: string;
    email?: string;
    avatarUrl?: string;
  } | null;
}

function useTheme(): [ThemeMode, (m: ThemeMode) => void] {
  const [mode, setMode] = useState<ThemeMode>('system');

  const apply = useCallback((m: ThemeMode) => {
    // Persist preference
    try {
      localStorage.setItem('theme', m);
    } catch {
      // ignore
    }

    // Apply to <html>
    try {
      const prefersDark = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      const shouldDark = m === 'dark' || (m === 'system' && prefersDark);
      document.documentElement.classList.toggle('dark', shouldDark);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      const saved = (localStorage.getItem('theme') as ThemeMode) || 'system';
      setMode(saved);
      // Also apply on mount
      const prefersDark = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      const shouldDark = saved === 'dark' || (saved === 'system' && prefersDark);
      document.documentElement.classList.toggle('dark', shouldDark);
    } catch {
      // ignore
    }
  }, []);

  const set = useCallback((m: ThemeMode) => {
    setMode(m);
    apply(m);
  }, [apply]);

  return [mode, set];
}

export default function Header({ locale, user = null }: HeaderProps) {
  const t = useTranslations();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useTheme();
  const base = `/${locale}`;

  const panelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!mobileOpen) return;
    const el = panelRef.current;
    if (!el) return;
    const focusable = el.querySelectorAll<HTMLElement>('a,button,[role="menuitem"],[tabindex]:not([tabindex="-1"])');
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
      if (e.key === 'Tab' && first && last) {
        if (e.shiftKey && document.activeElement === first) {
          last.focus(); e.preventDefault();
        } else if (!e.shiftKey && document.activeElement === last) {
          first.focus(); e.preventDefault();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    first?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [mobileOpen]);

  const closeOnOutsideClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) setMobileOpen(false);
  };

  const NavLinks = ({ onNavigate }: { onNavigate?: () => void }) => {
    const handle = () => onNavigate?.();
    return (
      <ul className="flex flex-col md:flex-row md:items-center gap-1 md:gap-2">
        <li><Link href={`${base}`} className="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-600" onClick={handle}>{t('header.nav.dashboard')}</Link></li>
        <li><Link href={`${base}/activities`} className="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-600" onClick={handle}>{t('header.nav.activities')}</Link></li>
        <li><Link href={`${base}/planner`} className="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-600" onClick={handle}>{t('header.nav.fields')}</Link></li>
        <li><Link href={`${base}/calendar`} className="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-600" onClick={handle}>{t('header.nav.calendar')}</Link></li>
        <li><Link href={`${base}/chat`} className="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-600" onClick={handle}>{t('header.nav.chat')}</Link></li>
        <li className="relative">
          <details className="group">
            <summary className="list-none cursor-pointer px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600" aria-label={t('header.nav.more')}>{t('header.nav.more')}</summary>
            <div className="absolute md:left-0 mt-1 w-48 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-30 p-1">
              <Link href={`${base}/analytics`} className="block px-3 py-2 rounded-md text-sm hover:bg-gray-100 dark:hover:bg-gray-800" onClick={handle}>Analytics</Link>
              <Link href={`${base}/community`} className="block px-3 py-2 rounded-md text-sm hover:bg-gray-100 dark:hover:bg-gray-800" onClick={handle}>{t('community.title')}</Link>
            </div>
          </details>
        </li>
      </ul>
    );
  };

  const SettingsMenu = () => (
    <details className="relative">
      <summary aria-label={t('header.settings')} className="list-none cursor-pointer px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-600">
        {t('header.settings')}
      </summary>
      <div className="absolute right-0 mt-1 w-72 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-30 p-2 space-y-2">
        <div className="px-1 text-xs font-semibold text-gray-500 dark:text-gray-400">{t('header.language')}</div>
        <div className="px-1"><LanguageSwitcher locale={locale} /></div>
        <div className="px-1 pt-2 text-xs font-semibold text-gray-500 dark:text-gray-400">{t('header.theme')}</div>
        <div className="px-1 flex items-center gap-1">
          <button type="button" onClick={() => setTheme('light')} className="px-3 py-1.5 rounded-md text-sm border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800" role="menuitem" aria-pressed={theme === 'light'}>{t('header.theme_light')}</button>
          <button type="button" onClick={() => setTheme('dark')} className="px-3 py-1.5 rounded-md text-sm border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800" role="menuitem" aria-pressed={theme === 'dark'}>{t('header.theme_dark')}</button>
          <button type="button" onClick={() => setTheme('system')} className="px-3 py-1.5 rounded-md text-sm border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800" role="menuitem" aria-pressed={theme === 'system'}>{t('header.theme_system')}</button>
        </div>
      </div>
    </details>
  );

  const AuthMenu = () => {
    if (!user) {
      return (
        <div className="flex items-center gap-2">
          <Link href={`${base}/login`} className="px-3 py-1.5 text-sm rounded-md border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800">{t('header.sign_in')}</Link>
          <Link href={`${base}/signup`} className="px-3 py-1.5 text-sm rounded-md bg-emerald-600 text-white hover:bg-emerald-700">{t('header.sign_up')}</Link>
        </div>
      );
    }
    const initials = (user.name || user.email || 'U').slice(0, 1).toUpperCase();
    return (
      <details className="relative">
        <summary className="list-none cursor-pointer flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800">
          {user.avatarUrl ? (<img src={user.avatarUrl} alt={user.name || 'User'} className="w-7 h-7 rounded-full" />) : (<div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-sm font-semibold">{initials}</div>)}
          <span className="text-sm">{user.name || user.email}</span>
        </summary>
        <div className="absolute right-0 mt-1 w-56 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-30 p-1">
          <Link href={`${base}/profile`} className="block px-3 py-2 rounded-md text-sm hover:bg-gray-100 dark:hover:bg-gray-800">{t('header.profile')}</Link>
          <button type="button" className="block w-full text-left px-3 py-2 rounded-md text-sm hover:bg-gray-100 dark:hover:bg-gray-800">{t('header.sign_out')}</button>
        </div>
      </details>
    );
  };

  return (
    <header role="banner" className="sticky top-0 z-40 backdrop-blur bg-white/70 dark:bg-gray-900/70 border-b border-gray-200 dark:border-gray-800">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-white focus:text-black focus:px-3 focus:py-1 focus:rounded focus:shadow">{t('header.a11y.skip_to_content')}</a>
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={base} className="flex items-center gap-2" aria-label={t('header.logo_alt')}>
            <Image src="/logo.svg" alt={t('header.logo_alt')} width={100} height={100} priority />
          </Link>
          <nav role="navigation" aria-label="Primary" className="hidden md:block ml-4"><NavLinks /></nav>
        </div>
        <div className="hidden md:flex items-center gap-2">
          <SettingsMenu />
          <AuthMenu />
        </div>
        <div className="md:hidden flex items-center gap-2">
          <button type="button" className="inline-flex items-center justify-center p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-600" aria-label={mobileOpen ? t('header.a11y.close_menu') : t('header.a11y.open_menu')} aria-expanded={mobileOpen} aria-controls="mobile-menu" onClick={() => setMobileOpen(v => !v)}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              {mobileOpen ? (<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />) : (<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />)}
            </svg>
          </button>
        </div>
      </div>
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/20" onClick={closeOnOutsideClick} aria-hidden="true">
          <div id="mobile-menu" ref={panelRef} role="dialog" aria-modal="true" className="absolute top-0 right-0 w-80 max-w-[85vw] h-full bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 shadow-xl p-4 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Image src="/logo.svg" alt={t('header.logo_alt')} width={28} height={28} />
              </div>
              <button type="button" className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-600" onClick={() => setMobileOpen(false)} aria-label={t('header.a11y.close_menu')}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <nav role="navigation" aria-label="Primary (mobile)"><NavLinks onNavigate={() => setMobileOpen(false)} /></nav>
            <div className="mt-auto flex flex-col gap-3 border-t border-gray-200 dark:border-gray-800 pt-3">
              <div className="px-1 text-sm font-semibold text-gray-800 dark:text-gray-200">{t('header.settings')}</div>
              <div className="px-1"><LanguageSwitcher locale={locale} /></div>
              <div className="px-1">
                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">{t('header.theme')}</div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setTheme('light')} className="px-3 py-1.5 rounded-md text-sm border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800" aria-pressed={theme === 'light'}>{t('header.theme_light')}</button>
                  <button type="button" onClick={() => setTheme('dark')} className="px-3 py-1.5 rounded-md text-sm border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800" aria-pressed={theme === 'dark'}>{t('header.theme_dark')}</button>
                  <button type="button" onClick={() => setTheme('system')} className="px-3 py-1.5 rounded-md text-sm border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800" aria-pressed={theme === 'system'}>{t('header.theme_system')}</button>
                </div>
              </div>
              <div className="px-1"><AuthMenu /></div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}