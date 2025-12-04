import { Store, TrendingUp, Package } from 'lucide-react';

export default function MarketPage() {
    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            <header className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
                <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Store className="w-5 h-5 text-orange-600" />
                    市場 (Market)
                </h1>
            </header>

            <main className="p-4 space-y-6">
                {/* Sales Overview */}
                <section>
                    <h2 className="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wider">売上概況 (Sales)</h2>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                            <p className="text-xs text-gray-500 mb-1">今月の売上</p>
                            <p className="text-xl font-bold text-gray-900">¥120,000</p>
                            <div className="flex items-center gap-1 text-xs text-green-600 mt-2">
                                <TrendingUp className="w-3 h-3" />
                                <span>+12%</span>
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                            <p className="text-xs text-gray-500 mb-1">出荷数</p>
                            <p className="text-xl font-bold text-gray-900">45 ケース</p>
                        </div>
                    </div>
                </section>

                {/* Inventory */}
                <section>
                    <h2 className="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wider">在庫 (Inventory)</h2>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-4 flex items-center justify-between border-b border-gray-50">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600">
                                    <Package className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="font-medium text-gray-900">コシヒカリ (新米)</p>
                                    <p className="text-xs text-gray-500">30kg袋</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="font-bold text-gray-900">12 袋</p>
                                <p className="text-xs text-orange-600">残りわずか</p>
                            </div>
                        </div>
                        <div className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center text-green-600">
                                    <Package className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="font-medium text-gray-900">小松菜</p>
                                    <p className="text-xs text-gray-500">FG袋</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="font-bold text-gray-900">80 袋</p>
                                <p className="text-xs text-green-600">在庫あり</p>
                            </div>
                        </div>
                    </div>
                    <button className="mt-3 w-full py-3 bg-orange-600 text-white font-medium rounded-xl hover:bg-orange-700 transition-colors">
                        出荷登録
                    </button>
                </section>
            </main>
        </div>
    );
}
