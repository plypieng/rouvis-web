'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useRef, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Locale } from '../i18n/config';
import LanguageSwitcher from './LanguageSwitcher';
import { signOut, useSession } from 'next-auth/react';

type ThemeMode = 'light' | 'dark' | 'system';

interface Alert {
  type: 'high_temp' | 'pest' | 'frost';
  value: string;
  name?: string;
}

interface JMAWarning {
  code: string;
  name: string;
  severity: 'advisory' | 'warning' | 'emergency';
  issued_at: string;
  areas: string[];
}

interface JMATyphoonInfo {
  id: string;
  name: string;
  center_lat: number;
  center_lon: number;
  pressure: number;
  max_wind_speed: number;
}

interface KPIs {
  health: number;
  yieldForecast: string;
}

interface HeaderProps {
  locale: Locale;
  // Placeholder for future auth integration (e.g. next-auth)
  user?: {
    name?: string;
    email?: string;
    avatarUrl?: string;
  } | null;
  alerts?: Alert[];
  kpis?: KPIs;
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

export default function Header({ locale, user = null, alerts = [], kpis }: HeaderProps) {
  const t = useTranslations();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useTheme();
  const [liveWarnings, setLiveWarnings] = useState<JMAWarning[]>([]);
  const [typhoons, setTyphoons] = useState<JMATyphoonInfo[]>([]);
  const base = `/${locale}`;
  const pathname = usePathname();

  // Use client-side session for real-time auth state (updates after OAuth without page refresh)
  const { data: session, status: sessionStatus } = useSession();

  // Debug logging
  console.log('[Header] useSession result:', { session, sessionStatus, user });

  // Use client-side session if available, otherwise fall back to server-passed user prop
  const currentUser = session?.user || user;
  const isSessionLoading = sessionStatus === 'loading';



  // Fetch live warnings from JMA API
  useEffect(() => {
    const fetchWarnings = async () => {
      try {
        const response = await fetch('/api/weather?type=warnings,typhoon');
        if (!response.ok) {
          console.error('Failed to fetch warnings:', response.status);
          return;
        }
        const data = await response.json();
        setLiveWarnings(data.warnings || []);
        setTyphoons(data.typhoons || []);
      } catch (error) {
        console.error('Failed to fetch warnings:', error);
      }
    };

    fetchWarnings();
    const interval = setInterval(fetchWarnings, 300000); // Refresh every 5 min
    return () => clearInterval(interval);
  }, []);

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
        <li><Link href={`${base}/projects`} className="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-600" onClick={handle}>マイプロジェクト</Link></li>
        <li><Link href={`${base}/map`} className="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-600" onClick={handle}>マップ</Link></li>
        <li><Link href={`${base}/calendar`} className="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-600" onClick={handle}>{t('header.nav.calendar')}</Link></li>
        <li><Link href={`${base}/team`} className="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-600" onClick={handle}>{t('header.nav.team')}</Link></li>
        <li><Link href={`${base}/market`} className="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-600" onClick={handle}>{t('header.nav.market')}</Link></li>
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

  const getSeverityColor = (severity: 'advisory' | 'warning' | 'emergency') => {
    switch (severity) {
      case 'emergency':
        return 'bg-rose-600 text-white'; // Red
      case 'warning':
        return 'bg-amber-500 text-white'; // Orange
      case 'advisory':
        return 'bg-sky-100 text-sky-700 dark:bg-sky-200/20'; // Blue
    }
  };

  const AlertChips = () => {
    // Merge manual alerts (from props) with live warnings
    const manualAlerts = alerts || [];
    const hasManualAlerts = manualAlerts.length > 0;
    const hasLiveWarnings = liveWarnings.length > 0;
    const hasTyphoons = typhoons.length > 0;

    if (!hasManualAlerts && !hasLiveWarnings && !hasTyphoons) return null;

    return (
      <div className="hidden md:flex items-center gap-2 ml-4">
        {/* Typhoon alert (highest priority) */}
        {hasTyphoons && (
          <div className="flex items-center gap-2 rounded-full bg-rose-600 text-white px-3 py-1 text-xs font-medium">
            <span className="material-symbols-outlined !text-base">warning</span>
            <span>台風{typhoons[0].name}接近中</span>
          </div>
        )}

        {/* Live JMA warnings */}
        {liveWarnings.map((warning, idx) => {
          let icon = 'warning';
          const label = warning.name;

          // Determine icon based on warning type
          if (warning.name && warning.name.includes('高温')) {
            icon = 'thermostat';
          } else if (warning.name && (warning.name.includes('霜') || warning.name.includes('低温'))) {
            icon = 'ac_unit';
          } else if (warning.name && warning.name.includes('大雨')) {
            icon = 'water_drop';
          } else if (warning.name && (warning.name.includes('暴風') || warning.name.includes('強風'))) {
            icon = 'air';
          }

          return (
            <div
              key={`jma-${idx}`}
              className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${getSeverityColor(warning.severity)}`}
            >
              <span className="material-symbols-outlined !text-base">{icon}</span>
              <span>{label}</span>
            </div>
          );
        })}

        {/* Manual alerts from props (for backward compatibility) */}
        {manualAlerts.map((alert, idx) => {
          let icon = 'warning';
          let bgClass = 'bg-rose-100/80 text-rose-700 dark:bg-rose-200/20';
          let label = '';

          switch (alert.type) {
            case 'high_temp':
              icon = 'thermostat';
              bgClass = 'bg-rose-100/80 text-rose-700 dark:bg-rose-200/20';
              label = t('alerts.high_temp_warning', { value: alert.value });
              break;
            case 'pest':
              icon = 'bug_report';
              bgClass = 'bg-amber-100/80 text-amber-700 dark:bg-amber-200/20';
              label = t('alerts.pest_warning', { name: alert.name || alert.value });
              break;
            case 'frost':
              icon = 'ac_unit';
              bgClass = 'bg-sky-100/80 text-sky-700 dark:bg-sky-200/20';
              label = t('alerts.frost_warning', { temp: alert.value });
              break;
          }

          return (
            <div key={`manual-${idx}`} className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${bgClass}`}>
              <span className="material-symbols-outlined !text-base">{icon}</span>
              <span>{label}</span>
            </div>
          );
        })}
      </div>
    );
  };

  const KPIIndicators = () => {
    if (!kpis) return null;

    const getHealthColor = (health: number) => {
      if (health >= 80) return 'text-crop-700 bg-crop-100/80 dark:bg-crop-200/20';
      if (health >= 60) return 'text-amber-700 bg-amber-100/80 dark:bg-amber-200/20';
      return 'text-rose-700 bg-rose-100/80 dark:bg-rose-200/20';
    };

    return (
      <div className="hidden lg:flex items-center gap-2 mr-2">
        <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${getHealthColor(kpis.health)}`}>
          <span className="material-symbols-outlined !text-base">agriculture</span>
          <span className="hidden xl:inline">{t('kpis.overall_health')}: </span>
          <span className="font-bold">{kpis.health}%</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium bg-crop-100/80 text-crop-700 dark:bg-crop-200/20">
          <span className="material-symbols-outlined !text-base">trending_up</span>
          <span className="hidden xl:inline">{t('kpis.yield_forecast')}: </span>
          <span className="font-bold">{kpis.yieldForecast}</span>
        </div>
      </div>
    );
  };

  const AuthMenu = () => {
    // Use top-level session state
    if (isSessionLoading) {
      return (
        <div className="flex items-center gap-2">
          <div className="w-20 h-8 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse" />
        </div>
      );
    }

    if (!currentUser) {
      return (
        <div className="flex items-center gap-2">
          <Link href={`${base}/login`} className="px-3 py-1.5 text-sm rounded-md border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800">{t('header.sign_in')}</Link>
          <Link href={`${base}/signup`} className="px-3 py-1.5 text-sm rounded-md bg-emerald-600 text-white hover:bg-emerald-700">{t('header.sign_up')}</Link>
        </div>
      );
    }
    const initials = (currentUser.name || currentUser.email || 'U').slice(0, 1).toUpperCase();
    // Handle both avatarUrl (from server prop) and image (from session)
    const avatarSrc = (currentUser as { avatarUrl?: string }).avatarUrl || (currentUser as { image?: string }).image;
    return (
      <details className="relative">
        <summary className="list-none cursor-pointer flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800">
          {avatarSrc ? (<img src={avatarSrc} alt={currentUser.name || 'User'} className="w-7 h-7 rounded-full" />) : (<div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-sm font-semibold">{initials}</div>)}
          <span className="text-sm">{currentUser.name || currentUser.email}</span>
        </summary>
        <div className="absolute right-0 mt-1 w-56 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-30 p-1">
          <Link href={`${base}/profile`} className="block px-3 py-2 rounded-md text-sm hover:bg-gray-100 dark:hover:bg-gray-800">{t('header.profile')}</Link>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: `${base}/login` })}
            className="block w-full text-left px-3 py-2 rounded-md text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            {t('header.sign_out')}
          </button>
        </div>
      </details>
    );
  };

  // Hide header on landing page for unauthenticated users (after session check completes)
  if (!isSessionLoading && !currentUser && (pathname === `/${locale}` || pathname === '/')) {
    return null;
  }

  return (
    <header role="banner" className="sticky top-0 z-40 glass-panel border-b-0">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-white focus:text-black focus:px-3 focus:py-1 focus:rounded focus:shadow">{t('header.a11y.skip_to_content')}</a>
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={base} className="flex items-center gap-2" aria-label={t('header.logo_alt')}>
            <Image src="/logo.svg" alt={t('header.logo_alt')} width={100} height={100} priority />
          </Link>
          <nav role="navigation" aria-label="Primary" className="hidden md:block ml-4"><NavLinks /></nav>
        </div>
        <div className="hidden md:flex items-center gap-2">
          <AlertChips />
          <KPIIndicators />
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
