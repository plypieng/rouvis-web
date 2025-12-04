'use client';

export default function AIInsightsPanel({ insights }: { insights: string[] }) {
    if (!insights || insights.length === 0) return null;

    return (
        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border-2 border-purple-200 rounded-xl p-6">
            <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-2xl text-white">psychology</span>
                </div>
                <div className="flex-1">
                    <h3 className="text-lg font-bold text-purple-900 mb-3">AIの提案理由</h3>
                    <ul className="space-y-2">
                        {insights.map((insight, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm text-purple-800">
                                <span className="material-symbols-outlined text-purple-600 text-base mt-0.5">check_circle</span>
                                <span>{insight}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
}
