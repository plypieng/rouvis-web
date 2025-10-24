'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { BarChart3, Users, Shield, Activity } from 'lucide-react';

export default function AdminDashboard() {
  const t = useTranslations('admin');

  // TODO: Add proper authentication when NextAuth is configured
  // For now, this page is accessible to all users for development/testing
  // The backend API endpoints should still enforce proper authentication

  const adminCards = [
    {
      title: t('usage.title') || '使用状況',
      description: t('usage.description') || 'トークン消費量とAPI呼び出し数',
      href: '/admin/usage',
      icon: BarChart3,
      color: 'bg-blue-500',
    },
    {
      title: t('audit_logs.title') || '監査ログ',
      description: t('audit_logs.description') || 'すべてのエージェントアクション',
      href: '/admin/audit-logs',
      icon: Shield,
      color: 'bg-green-500',
    },
    {
      title: t('users.title') || 'ユーザー管理',
      description: t('users.description') || '農家アカウントの管理',
      href: '/admin/users',
      icon: Users,
      color: 'bg-purple-500',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Activity className="w-8 h-8 text-gray-900" />
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            {t('dashboard.title') || '管理ダッシュボード'}
          </h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {adminCards.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.href}
                href={card.href}
                className="bg-white rounded-lg shadow hover:shadow-lg transition p-6 border border-gray-200 hover:border-gray-300"
              >
                <div className="flex items-start gap-4">
                  <div className={`${card.color} p-3 rounded-lg flex-shrink-0`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-1">
                      {card.title}
                    </h2>
                    <p className="text-sm text-gray-600">{card.description}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Quick Stats Overview */}
        <div className="mt-8 bg-white rounded-lg shadow p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {t('dashboard.overview') || 'システム概要'}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-gray-600">
            <div>
              <div className="text-gray-500 mb-1">環境</div>
              <div className="font-medium text-gray-900">
                {process.env.NODE_ENV === 'production' ? '本番環境' : '開発環境'}
              </div>
            </div>
            <div>
              <div className="text-gray-500 mb-1">バージョン</div>
              <div className="font-medium text-gray-900">v1.0.0-beta</div>
            </div>
            <div>
              <div className="text-gray-500 mb-1">状態</div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="font-medium text-gray-900">稼働中</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
