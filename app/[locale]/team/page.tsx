import { Users, MessageCircle } from 'lucide-react';

export default function TeamPage() {
    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            <header className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
                <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Users className="w-5 h-5 text-green-600" />
                    チーム (Team)
                </h1>
            </header>

            <main className="p-4 space-y-6">
                {/* Members Section */}
                <section>
                    <h2 className="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wider">メンバー (Members)</h2>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-4 flex items-center gap-4 border-b border-gray-50 last:border-0">
                            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold">
                                Me
                            </div>
                            <div>
                                <p className="font-medium text-gray-900">自分 (Owner)</p>
                                <p className="text-xs text-gray-500">管理者</p>
                            </div>
                        </div>
                        <div className="p-4 flex items-center gap-4 border-b border-gray-50 last:border-0">
                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                                A
                            </div>
                            <div>
                                <p className="font-medium text-gray-900">アルバイト A</p>
                                <p className="text-xs text-gray-500">作業員</p>
                            </div>
                        </div>
                    </div>
                    <button className="mt-3 w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 font-medium hover:bg-gray-50 transition-colors">
                        + メンバーを追加
                    </button>
                </section>

                {/* Experts Section */}
                <section>
                    <h2 className="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wider">専門家 (Experts)</h2>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                <MessageCircle className="w-6 h-6" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-medium text-gray-900">JA指導員</h3>
                                <p className="text-sm text-gray-600 mt-1">
                                    栽培技術や病害虫対策について相談できます。
                                </p>
                                <button className="mt-3 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 w-full">
                                    チャットで相談
                                </button>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
}
