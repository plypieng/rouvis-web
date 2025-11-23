'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { 
  Home, 
  Map, 
  Calendar, 
  BarChart, 
  BookOpen, 
  MessageSquare 
} from 'lucide-react';

type NavItem = {
  name: string;
  href: string;
  icon: React.ElementType;
};

const SideNav = () => {
  const pathname = usePathname();
  const t = useTranslations();

  // Extract locale from pathname
  const locale = pathname.split('/')[1];

  const isActive = (path: string) => {
    return pathname.endsWith(path);
  };

  const navItems: NavItem[] = [
    { name: t('navigation.dashboard'), href: '/', icon: Home },
    { name: t('navigation.planner'), href: '/planner', icon: Map },
    { name: t('navigation.calendar'), href: '/calendar', icon: Calendar },
    { name: t('navigation.analytics'), href: '/analytics', icon: BarChart },
    { name: t('navigation.community'), href: '/community', icon: BookOpen },
    { name: t('navigation.chat'), href: '/chat', icon: MessageSquare },
  ];
  
  return (
    <aside className="w-64 h-screen bg-white shadow-lg flex flex-col">
      <div className="p-6">
        <h1 className="text-xl font-bold text-primary-700 flex items-center">
          <span className="mr-2">🌾</span>
          {t('app_name')}
        </h1>
        <p className="text-sm text-gray-500 mt-1">{t('strategic_planning')}</p>
      </div>
      
      <nav className="mt-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            return (
              <li key={item.href}>
                <Link 
                  href={`/${locale}${item.href}`}
                  className={`flex items-center px-6 py-3 text-sm font-medium ${
                    isActive(item.href) 
                      ? "bg-primary-50 text-primary-600 border-r-4 border-primary-600" 
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <item.icon className="h-5 w-5 mr-3" />
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      
      <div className="mt-auto px-4 py-6 border-t border-gray-200">
        <div className="flex items-center">
          <div className="w-8 h-8 rounded-full bg-gray-300"></div>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-700">{t('farmer')}</p>
            <p className="text-xs text-gray-500">{t('niigata_japan')}</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default SideNav;
