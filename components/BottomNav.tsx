'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Home, Menu, Map as MapIcon } from 'lucide-react';

/**
 * Bottom Navigation - Mobile-first, thumb-zone optimized
 *
 * Principles (FARMER_UX_VISION.md - Principle 6: Mobile-First Chat):
 * - Thumb-zone optimized (bottom of screen)
 * - Minimum 44pt × 44pt touch targets (Apple HIG)
 * - Large, obvious buttons
 * - Icons with labels (not just icons)
 * - Works with gloves
 *
 * Navigation Structure (Farmer-First Operational UX):
 * - 今日 (Today): Home/Chat view
 * - マップ (Map): Field Map
 * - メニュー (Menu): Planning/Records/Knowledge
 */
export function BottomNav({
  locale,
  user,
}: {
  locale: string;
  user?: unknown;
}) {
  const pathname = usePathname();

  // Hide bottom nav on landing page for unauthenticated users
  const isLandingPage = pathname === `/${locale}` || pathname === '/';
  if (!user && isLandingPage) {
    return null;
  }

  const isActive = (path: string) => {
    if (path === `/${locale}`) {
      return pathname === `/${locale}` || pathname === `/${locale}/`;
    }
    return pathname?.startsWith(path);
  };

  const navItems = [
    {
      id: 'today',
      label: '今日',
      icon: Home,
      href: `/${locale}`,
      description: 'Today view',
    },
    {
      id: 'map',
      label: 'マップ',
      icon: MapIcon,
      href: `/${locale}/map`,
      description: 'Field Map',
    },
    {
      id: 'menu',
      label: 'メニュー',
      icon: Menu,
      href: `/${locale}/menu`,
      description: 'More options',
    },
  ];

  return (
    <nav
      className="fixed bottom-4 left-4 right-4 bg-white/90 backdrop-blur-md border border-white/20 shadow-glass rounded-2xl z-50 lg:hidden animate-slideIn"
      role="navigation"
      aria-label="メインナビゲーション"
    >
      <div className="flex items-center justify-around h-20 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          return (
            <Link
              key={item.id}
              href={item.href}
              className={`
                flex flex-col items-center justify-center gap-1
                min-w-[72px] min-h-[64px] rounded-lg
                transition-all duration-200
                ${active
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                }
                active:scale-95
              `}
              aria-label={item.description}
              aria-current={active ? 'page' : undefined}
            >
              <Icon
                className={`w-7 h-7 ${active ? 'stroke-[2.5]' : 'stroke-2'}`}
                strokeWidth={active ? 2.5 : 2}
              />
              <span className="text-xs font-medium">{item.label}</span>
              {active && (
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-12 h-1 bg-primary rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
