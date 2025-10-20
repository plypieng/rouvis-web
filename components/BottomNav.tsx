'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Home, Calendar, TrendingUp, Book } from 'lucide-react';

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
 * Navigation Structure (simplified from sidebar):
 * - 今日 (Today): Home/Chat view
 * - 今週 (Week): Calendar/Planning
 * - 記録 (History): Analytics/Activity log
 * - 知識 (Knowledge): Community/Guidebooks
 */
export function BottomNav({ locale }: { locale: string }) {
  const pathname = usePathname();

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
      id: 'week',
      label: '今週',
      icon: Calendar,
      href: `/${locale}/calendar`,
      description: 'Week planning',
    },
    {
      id: 'history',
      label: '記録',
      icon: TrendingUp,
      href: `/${locale}/analytics`,
      description: 'Activity history',
    },
    {
      id: 'knowledge',
      label: '知識',
      icon: Book,
      href: `/${locale}/community`,
      description: 'Knowledge base',
    },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-200 shadow-2xl z-50 lg:hidden"
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
                ${
                  active
                    ? 'bg-green-50 text-green-700 font-semibold'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
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
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-green-600 rounded-t-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
