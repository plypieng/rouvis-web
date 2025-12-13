import Link from 'next/link';
import { Calendar, TrendingUp, Book, Settings, ChevronRight, User } from 'lucide-react';
import { getServerSessionFromToken } from '@/lib/server-auth';

export default async function MenuPage({ params: { locale } }: { params: { locale: string } }) {
    const session = await getServerSessionFromToken();
    const displayName = session?.user?.name || session?.user?.email || 'ユーザー';

    const menuItems = [
        {
            title: '今週の予定 (Calendar)',
            description: '作業計画とスケジュール管理',
            icon: Calendar,
            href: `/${locale}/calendar`,
            color: 'text-blue-600',
            bg: 'bg-blue-100',
        },
        {
            title: '記録・分析 (Records)',
            description: '過去の作業履歴と収穫データ',
            icon: TrendingUp,
            href: `/${locale}/records`,
            color: 'text-green-600',
            bg: 'bg-green-100',
        },
        {
            title: '知識・マニュアル (Knowledge)',
            description: '栽培ガイドとコミュニティ',
            icon: Book,
            href: `/${locale}/knowledge`,
            color: 'text-purple-600',
            bg: 'bg-purple-100',
        },
    ];

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            <header className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
                <h1 className="text-lg font-bold text-gray-900">メニュー (Menu)</h1>
            </header>

            <main className="p-4 space-y-6">
                {/* Profile Summary */}
                <section className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                        <User className="w-8 h-8" />
                    </div>
                    <div className="flex-1">
                        <h2 className="font-bold text-gray-900">{displayName}</h2>
                        <p className="text-sm text-gray-500">プロフィール未設定</p>
                    </div>
                    <Link href={`/${locale}/settings`} className="p-2 text-gray-400 hover:text-gray-600">
                        <Settings className="w-6 h-6" />
                    </Link>
                </section>

                {/* Main Navigation Links */}
                <section className="space-y-3">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider px-1">機能一覧</h3>
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className="flex items-center gap-4 p-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:bg-gray-50 transition-colors group"
                            >
                                <div className={`w-12 h-12 rounded-lg ${item.bg} flex items-center justify-center ${item.color}`}>
                                    <Icon className="w-6 h-6" />
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-gray-900 group-hover:text-green-700 transition-colors">
                                        {item.title}
                                    </h4>
                                    <p className="text-xs text-gray-500 mt-1">{item.description}</p>
                                </div>
                                <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-green-600" />
                            </Link>
                        );
                    })}
                </section>

                {/* Settings Link (Secondary) */}
                <section>
                    <Link
                        href={`/${locale}/settings`}
                        className="flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm border border-gray-100 text-gray-600 hover:bg-gray-50"
                    >
                        <Settings className="w-5 h-5" />
                        <span className="font-medium">設定 (Settings)</span>
                    </Link>
                </section>
            </main>
        </div>
    );
}
