import Link from 'next/link';
import { AlertCircle, Calendar, TrendingUp, Book, Settings, ChevronRight, User } from 'lucide-react';
import { getServerSessionFromToken } from '@/lib/server-auth';
import { getWebFeatureFlags } from '@/lib/feature-flags';
import MenuNoticeTracker from '@/components/MenuNoticeTracker';

type MenuNoticeKey = 'team_unavailable' | 'market_unavailable' | null;

function parseMenuNotice(rawNotice: string | undefined): MenuNoticeKey {
    if (rawNotice === 'team_unavailable') return 'team_unavailable';
    if (rawNotice === 'market_unavailable') return 'market_unavailable';
    return null;
}

function menuNoticeMessage(notice: MenuNoticeKey): string | null {
    if (notice === 'team_unavailable') {
        return 'チーム機能は現在公開されていません。使える画面へ自動で戻しました。';
    }
    if (notice === 'market_unavailable') {
        return '市場機能は現在公開されていません。使える画面へ自動で戻しました。';
    }
    return null;
}

export default async function MenuPage(props: {
    params: Promise<{ locale: string }>;
    searchParams?: Promise<{ notice?: string }>;
}) {
    const { params, searchParams } = props;
    const { locale } = await params;
    const resolvedSearchParams = searchParams ? await searchParams : undefined;
    const notice = parseMenuNotice(resolvedSearchParams?.notice);
    const noticeMessage = menuNoticeMessage(notice);
    const session = await getServerSessionFromToken();
    const featureFlags = getWebFeatureFlags();
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
        ...(featureFlags.knowledgePage ? [{
            title: '知識相談 (Chat)',
            description: 'マニュアル機能は準備中。今はチャットで相談できます',
            icon: Book,
            href: `/${locale}/chat`,
            color: 'text-purple-600',
            bg: 'bg-purple-100',
        }] : []),
    ];

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            <MenuNoticeTracker notice={notice} />
            <header className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
                <h1 className="text-lg font-bold text-gray-900">メニュー (Menu)</h1>
            </header>

            <main className="p-4 space-y-6">
                {noticeMessage ? (
                    <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
                        <div className="flex items-start gap-2">
                            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                            <div>
                                <p className="text-sm font-semibold">利用可能な画面へ移動しました</p>
                                <p className="mt-1 text-sm">{noticeMessage}</p>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    <Link
                                        href={`/${locale}`}
                                        className="inline-flex items-center rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100"
                                    >
                                        ダッシュボードへ戻る
                                    </Link>
                                    <Link
                                        href={`/${locale}/chat`}
                                        className="inline-flex items-center rounded-lg bg-amber-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-800"
                                    >
                                        チャットで相談
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </section>
                ) : null}

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
