import { Users, CalendarDays, CheckSquare, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getWebFeatureFlags } from '@/lib/feature-flags';

export default async function TeamPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const featureFlags = getWebFeatureFlags();

    if (!featureFlags.teamPage) {
        notFound();
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            <header className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
                <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Users className="w-5 h-5 text-green-600" />
                    チーム
                </h1>
            </header>

            <main className="p-4 space-y-6">
                <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h2 className="text-lg font-semibold text-gray-900">チーム機能は準備中です</h2>
                    <p className="text-sm text-gray-600 mt-2">
                        現在は個人アカウント向けに「予定・記録・AI相談」を優先して提供しています。チーム共有は今後追加予定です。
                    </p>

                    <div className="mt-5 space-y-3 text-sm text-gray-700">
                        <div className="flex items-center gap-2">
                            <UserPlus className="w-4 h-4 text-green-600" />
                            <span>メンバー招待・権限管理</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <CalendarDays className="w-4 h-4 text-blue-600" />
                            <span>スケジュール共有（誰が・いつ・どこで）</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <CheckSquare className="w-4 h-4 text-purple-600" />
                            <span>作業の割り当て・完了報告</span>
                        </div>
                    </div>

                    <Link
                        href={`/${locale}/chat`}
                        className="mt-6 w-full py-3 rounded-xl bg-green-600 text-white font-medium text-center hover:bg-green-700 transition-colors block"
                    >
                        チャットで相談する
                    </Link>
                </section>
            </main>
        </div>
    );
}
