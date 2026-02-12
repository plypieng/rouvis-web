'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { Bell, CalendarDays, LayoutDashboard, ListChecks, MapIcon, MessageSquare, Menu, X } from 'lucide-react';
import LanguageSwitcher from './LanguageSwitcher';
import type { Locale } from '../i18n/config';
import type { ShellNavItem, StatusBadgeProps } from '@/types/ui-shell';

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
}

interface JMATyphoonInfo {
  id: string;
  name: string;
}

interface KPIs {
  health: number;
  yieldForecast: string;
}

interface HeaderProps {
  locale: Locale;
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

  const apply = (value: ThemeMode) => {
    try {
      localStorage.setItem('theme', value);
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const shouldDark = value === 'dark' || (value === 'system' && prefersDark);
      document.documentElement.classList.toggle('dark', shouldDark);
    } catch {
      // noop
    }
  };

  useEffect(() => {
    try {
      const saved = (localStorage.getItem('theme') as ThemeMode) || 'system';
      setMode(saved);
      apply(saved);
    } catch {
      // noop
    }
  }, []);

  return [mode, (value) => {
    setMode(value);
    apply(value);
  }];
}

function statusClassForWarning(severity: JMAWarning['severity']): StatusBadgeProps['tone'] {
  if (severity === 'emergency') return 'critical';
  if (severity === 'warning') return 'warning';
  return 'watch';
}

function StatusBadge({ tone, label, icon, size = 'sm' }: StatusBadgeProps) {
  const toneClass =
    tone === 'critical'
      ? 'status-critical'
      : tone === 'warning'
        ? 'status-warning'
        : tone === 'watch'
          ? 'status-watch'
          : tone === 'safe'
            ? 'status-safe'
            : 'border border-border/90 bg-muted/80 text-muted-foreground';

  const sizeClass = size === 'md' ? 'px-3 py-1.5 text-xs' : 'px-2.5 py-1 text-[11px]';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-medium ${toneClass} ${sizeClass}`}>
      {icon}
      <span>{label}</span>
    </span>
  );
}

function getRouteLabel(locale: Locale, key: 'projects' | 'records' | 'map'): string {
  if (locale === 'ja') {
    if (key === 'projects') return 'プロジェクト';
    if (key === 'records') return '記録';
    return 'マップ';
  }

  if (key === 'projects') return 'Projects';
  if (key === 'records') return 'Records';
  return 'Map';
}

export default function Header({ locale, user = null, alerts = [], kpis }: HeaderProps) {
  const t = useTranslations();
  const pathname = usePathname();
  const base = `/${locale}`;
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useTheme();
  const [liveWarnings, setLiveWarnings] = useState<JMAWarning[]>([]);
  const [typhoons, setTyphoons] = useState<JMATyphoonInfo[]>([]);
  const { data: session, status: sessionStatus } = useSession();

  const currentUser = session?.user || user;
  const isSessionLoading = sessionStatus === 'loading';

  const navItems: ShellNavItem[] = useMemo(
    () => [
      { id: 'dashboard', href: `${base}`, label: t('header.nav.dashboard') },
      { id: 'projects', href: `${base}/projects`, label: getRouteLabel(locale, 'projects') },
      { id: 'calendar', href: `${base}/calendar`, label: t('header.nav.calendar') },
      { id: 'records', href: `${base}/records`, label: getRouteLabel(locale, 'records') },
      { id: 'map', href: `${base}/map`, label: getRouteLabel(locale, 'map') },
      { id: 'chat', href: `${base}/chat`, label: t('header.nav.chat') },
    ],
    [base, locale, t]
  );

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;

    const currentOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = currentOverflow;
    };
  }, [mobileOpen]);

  useEffect(() => {
    let ignore = false;

    const fetchWarnings = async () => {
      try {
        const response = await fetch('/api/weather?type=warnings,typhoon');
        if (!response.ok) return;
        const data = await response.json();
        if (ignore) return;

        setLiveWarnings(Array.isArray(data.warnings) ? data.warnings : []);
        setTyphoons(Array.isArray(data.typhoons) ? data.typhoons : []);
      } catch {
        // noop
      }
    };

    fetchWarnings();
    const interval = setInterval(fetchWarnings, 300000);
    return () => {
      ignore = true;
      clearInterval(interval);
    };
  }, []);

  const isAuthPage = pathname?.includes('/login') || pathname?.includes('/signup');
  const isLandingPage = pathname === `/${locale}` || pathname === '/';

  if (isAuthPage) {
    return null;
  }

  if (!isSessionLoading && !currentUser && isLandingPage) {
    return null;
  }

  const isActive = (href: string) => {
    if (href === base) {
      return pathname === base || pathname === `${base}/`;
    }

    return pathname?.startsWith(href);
  };

  const initials = (currentUser?.name || currentUser?.email || 'U').slice(0, 1).toUpperCase();
  const avatarSrc =
    (currentUser as { avatarUrl?: string } | null)?.avatarUrl ||
    (currentUser as { image?: string } | null)?.image;

  const warningChips = [
    ...alerts.map((manualAlert) => ({
      id: `manual-${manualAlert.type}-${manualAlert.value}`,
      tone: manualAlert.type === 'high_temp' ? 'warning' : manualAlert.type === 'pest' ? 'watch' : 'critical',
      label:
        manualAlert.type === 'high_temp'
          ? t('alerts.high_temp_warning', { value: manualAlert.value })
          : manualAlert.type === 'pest'
            ? t('alerts.pest_warning', { name: manualAlert.name || manualAlert.value })
            : t('alerts.frost_warning', { temp: manualAlert.value }),
    })),
    ...liveWarnings.slice(0, 2).map((warning) => ({
      id: `jma-${warning.code}`,
      tone: statusClassForWarning(warning.severity),
      label: warning.name,
    })),
    ...(typhoons[0]
      ? [{ id: `typhoon-${typhoons[0].id}`, tone: 'critical', label: `${typhoons[0].name} 接近` }]
      : []),
  ] as Array<{ id: string; tone: StatusBadgeProps['tone']; label: string }>;

  return (
    <header role="banner" className="shell-header sticky top-0 z-40">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-card focus:px-3 focus:py-2 focus:text-foreground"
      >
        {t('header.a11y.skip_to_content')}
      </a>

      <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <Link href={base} className="flex items-center gap-2" aria-label={t('header.logo_alt')}>
            <Image src="/logo.svg" alt={t('header.logo_alt')} width={28} height={28} priority />
            <span className="hidden text-sm font-semibold text-foreground sm:inline-block">{t('header.app_name')}</span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
            {navItems.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`rounded-lg px-3 py-2 text-sm transition-colors ${
                    active
                      ? 'bg-primary/12 text-primary font-semibold'
                      : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                  }`}
                  aria-current={active ? 'page' : undefined}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="hidden items-center gap-2 lg:flex">
          {warningChips.length > 0 && (
            <div className="mr-1 hidden items-center gap-1 xl:flex">
              {warningChips.map((chip) => (
                <StatusBadge key={chip.id} tone={chip.tone} label={chip.label} icon={<Bell className="h-3.5 w-3.5" />} />
              ))}
            </div>
          )}

          {kpis && (
            <StatusBadge
              tone={kpis.health >= 80 ? 'safe' : kpis.health >= 60 ? 'watch' : 'warning'}
              label={`${t('kpis.overall_health')}: ${kpis.health}%`}
              icon={<ListChecks className="h-3.5 w-3.5" />}
            />
          )}

          <details className="relative">
            <summary className="list-none cursor-pointer rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted/70 hover:text-foreground">
              {t('header.settings')}
            </summary>
            <div className="surface-overlay absolute right-0 mt-2 w-72 p-3">
              <div className="mb-3">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('header.language')}</p>
                <LanguageSwitcher locale={locale} />
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('header.theme')}</p>
                <div className="flex items-center gap-1">
                  {(['light', 'dark', 'system'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setTheme(mode)}
                      className={`rounded-md px-2.5 py-1.5 text-xs ${
                        theme === mode
                          ? 'bg-primary/15 text-primary font-semibold'
                          : 'bg-muted text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {mode === 'light' ? t('header.theme_light') : mode === 'dark' ? t('header.theme_dark') : t('header.theme_system')}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </details>

          {isSessionLoading ? (
            <div className="h-8 w-20 animate-pulse rounded-md bg-muted" />
          ) : !currentUser ? (
            <div className="flex items-center gap-2">
              <Link href={`${base}/login`} className="rounded-lg border border-border px-3 py-1.5 text-sm text-foreground hover:bg-muted/60">
                {t('header.sign_in')}
              </Link>
              <Link href={`${base}/signup`} className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground hover:opacity-95">
                {t('header.sign_up')}
              </Link>
            </div>
          ) : (
            <details className="relative">
              <summary className="list-none cursor-pointer rounded-full ring-offset-background hover:ring-2 hover:ring-border">
                {avatarSrc ? (
                  <img src={avatarSrc} alt={currentUser.name || 'User'} className="h-8 w-8 rounded-full" />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                    {initials}
                  </div>
                )}
              </summary>
              <div className="surface-overlay absolute right-0 mt-2 w-56 p-2">
                <Link href={`${base}/profile`} className="block rounded-md px-3 py-2 text-sm hover:bg-muted">
                  {t('header.profile')}
                </Link>
                <Link href={`${base}/account`} className="block rounded-md px-3 py-2 text-sm hover:bg-muted">
                  {t('header.account')}
                </Link>
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: `${base}/login` })}
                  className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
                >
                  {t('header.sign_out')}
                </button>
              </div>
            </details>
          )}
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          {currentUser && (
            <Link href={`${base}/profile`} className="rounded-full ring-offset-background hover:ring-2 hover:ring-border">
              {avatarSrc ? (
                <img src={avatarSrc} alt={currentUser.name || 'User'} className="h-8 w-8 rounded-full" />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                  {initials}
                </div>
              )}
            </Link>
          )}
          <button
            type="button"
            className="rounded-lg border border-border p-2 text-foreground"
            onClick={() => setMobileOpen((open) => !open)}
            aria-label={mobileOpen ? t('header.a11y.close_menu') : t('header.a11y.open_menu')}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 bg-black/30 lg:hidden" onClick={() => setMobileOpen(false)}>
          <div
            className="surface-overlay absolute right-0 top-0 h-full w-[88vw] max-w-sm overflow-y-auto p-4"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Image src="/logo.svg" alt={t('header.logo_alt')} width={24} height={24} />
                <span className="text-sm font-semibold text-foreground">{t('header.app_name')}</span>
              </div>
              <button type="button" onClick={() => setMobileOpen(false)} className="rounded-md p-2 hover:bg-muted" aria-label={t('header.a11y.close_menu')}>
                <X className="h-4 w-4" />
              </button>
            </div>

            <nav className="space-y-1" aria-label="Primary mobile">
              {navItems.map((item) => {
                const active = isActive(item.href);
                const Icon =
                  item.id === 'dashboard'
                    ? LayoutDashboard
                    : item.id === 'projects'
                      ? ListChecks
                      : item.id === 'calendar'
                        ? CalendarDays
                        : item.id === 'records'
                          ? ListChecks
                          : item.id === 'map'
                            ? MapIcon
                            : MessageSquare;

                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm ${
                      active ? 'bg-primary/12 text-primary font-semibold' : 'text-foreground hover:bg-muted'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="mt-5 border-t border-border pt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('header.language')}</p>
              <LanguageSwitcher locale={locale} />

              <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('header.theme')}</p>
              <div className="flex items-center gap-1">
                {(['light', 'dark', 'system'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setTheme(mode)}
                    className={`rounded-md px-2.5 py-1.5 text-xs ${
                      theme === mode ? 'bg-primary/15 text-primary font-semibold' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {mode === 'light' ? t('header.theme_light') : mode === 'dark' ? t('header.theme_dark') : t('header.theme_system')}
                  </button>
                ))}
              </div>
            </div>

            {warningChips.length > 0 && (
              <div className="mt-5 border-t border-border pt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Alerts</p>
                <div className="flex flex-wrap gap-1.5">
                  {warningChips.map((chip) => (
                    <StatusBadge key={chip.id} tone={chip.tone} label={chip.label} icon={<Bell className="h-3.5 w-3.5" />} />
                  ))}
                </div>
              </div>
            )}

            <div className="mt-5 border-t border-border pt-4">
              {!currentUser ? (
                <div className="grid grid-cols-2 gap-2">
                  <Link href={`${base}/login`} className="rounded-lg border border-border px-3 py-2 text-center text-sm">
                    {t('header.sign_in')}
                  </Link>
                  <Link href={`${base}/signup`} className="rounded-lg bg-primary px-3 py-2 text-center text-sm font-semibold text-primary-foreground">
                    {t('header.sign_up')}
                  </Link>
                </div>
              ) : (
                <>
                  <Link href={`${base}/profile`} className="block rounded-lg px-3 py-2 text-sm hover:bg-muted">
                    {t('header.profile')}
                  </Link>
                  <Link href={`${base}/account`} className="block rounded-lg px-3 py-2 text-sm hover:bg-muted">
                    {t('header.account')}
                  </Link>
                  <button
                    type="button"
                    onClick={() => signOut({ callbackUrl: `${base}/login` })}
                    className="mt-1 block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-muted"
                  >
                    {t('header.sign_out')}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
