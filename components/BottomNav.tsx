'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarDays, Home, ListChecks, Menu, MessageSquare } from 'lucide-react';
import type { ShellNavItem } from '@/types/ui-shell';

export function BottomNav({
  locale,
  user,
}: {
  locale: string;
  user?: unknown;
}) {
  const pathname = usePathname();
  const base = `/${locale}`;

  const isLandingPage = pathname === `/${locale}` || pathname === '/';
  const isAuthPage = pathname?.includes('/login') || pathname?.includes('/signup');

  if ((!user && isLandingPage) || isAuthPage) {
    return null;
  }

  const navItems: Array<ShellNavItem & { icon: typeof Home }> = [
    {
      id: 'home',
      href: `${base}`,
      label: locale === 'ja' ? '今日' : 'Home',
      icon: Home,
      ariaLabel: locale === 'ja' ? 'ダッシュボード' : 'Dashboard',
    },
    {
      id: 'projects',
      href: `${base}/projects`,
      label: locale === 'ja' ? '計画' : 'Plans',
      icon: ListChecks,
    },
    {
      id: 'calendar',
      href: `${base}/calendar`,
      label: locale === 'ja' ? '予定' : 'Calendar',
      icon: CalendarDays,
    },
    {
      id: 'chat',
      href: `${base}/chat`,
      label: locale === 'ja' ? '相談' : 'Assistant',
      icon: MessageSquare,
    },
    {
      id: 'menu',
      href: `${base}/menu`,
      label: locale === 'ja' ? 'その他' : 'More',
      icon: Menu,
    },
  ];

  const isActive = (href: string) => {
    if (href === `${base}`) {
      return pathname === `${base}` || pathname === `${base}/`;
    }

    return pathname?.startsWith(href);
  };

  return (
    <nav
      className="fixed inset-x-4 bottom-3 z-50 rounded-2xl border border-border/90 bg-card/95 px-2 pb-[calc(0.3rem+env(safe-area-inset-bottom))] pt-2 shadow-shell backdrop-blur lg:hidden"
      role="navigation"
      aria-label="Main mobile navigation"
    >
      <div className="grid grid-cols-5 gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          return (
            <Link
              key={item.id}
              href={item.href}
              aria-label={item.ariaLabel || item.label}
              aria-current={active ? 'page' : undefined}
              className={`mobile-tap relative flex min-h-[62px] flex-col items-center justify-center rounded-xl px-1 transition-all ${
                active ? 'bg-primary/12 text-primary' : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
              }`}
            >
              <Icon className={`mb-1 h-5 w-5 ${active ? 'stroke-[2.2px]' : 'stroke-2'}`} />
              <span className="text-[10px] font-semibold leading-none">{item.label}</span>
              {active && <span className="absolute bottom-1.5 h-1 w-9 rounded-full bg-primary" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
