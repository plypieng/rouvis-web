import { Store, BarChart3, Package, Truck } from 'lucide-react';
import Link from 'next/link';

export default function MarketPage({ params: { locale } }: { params: { locale: string } }) {
    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            <header className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
                <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Store className="w-5 h-5 text-orange-600" />
                    市場
                </h1>
            </header>

            <main className="p-4 space-y-6">
                <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h2 className="text-lg font-semibold text-gray-900">市場機能は準備中です</h2>
                    <p className="text-sm text-gray-600 mt-2">
                        収穫後の「出荷・在庫・売上」管理は今後追加予定です。現時点は栽培計画と作業記録に集中できます。
                    </p>

                    <div className="mt-5 space-y-3 text-sm text-gray-700">
                        <div className="flex items-center gap-2">
                            <Truck className="w-4 h-4 text-orange-600" />
                            <span>出荷登録（出荷日・数量・単価）</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Package className="w-4 h-4 text-green-600" />
                            <span>在庫管理（ロット・保管場所・期限）</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <BarChart3 className="w-4 h-4 text-blue-600" />
                            <span>売上レポート（作物別・月別）</span>
                        </div>
                    </div>

                    <Link
                        href={`/${locale}/chat`}
                        className="mt-6 w-full py-3 rounded-xl bg-orange-600 text-white font-medium text-center hover:bg-orange-700 transition-colors block"
                    >
                        チャットで相談する
                    </Link>
                </section>
            </main>
        </div>
    );
}
