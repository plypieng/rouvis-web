'use client';

export default function CropAnalysisCard({ analysis }: { analysis: any }) {
    if (!analysis) return null;

    return (
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-6 mb-6">
            <div className="flex items-start gap-4">
                <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-3xl text-white">eco</span>
                </div>
                <div className="flex-1">
                    <h3 className="text-2xl font-bold text-green-900 mb-2">
                        {analysis.crop}
                        {analysis.variety && <span className="text-lg font-normal text-green-700 ml-2">({analysis.variety})</span>}
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-green-600">calendar_today</span>
                            <div>
                                <p className="text-xs text-green-600">最適な植付時期</p>
                                <p className="font-semibold text-green-900">{new Date(analysis.startDate).toLocaleDateString('ja-JP')}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-green-600">schedule</span>
                            <div>
                                <p className="text-xs text-green-600">収穫まで</p>
                                <p className="font-semibold text-green-900">{analysis.daysToHarvest || 120} 日</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-green-600">agriculture</span>
                            <div>
                                <p className="text-xs text-green-600">収穫予定</p>
                                <p className="font-semibold text-green-900">{new Date(analysis.targetHarvestDate).toLocaleDateString('ja-JP')}</p>
                            </div>
                        </div>
                    </div>

                    {analysis.notes && (
                        <div className="mt-4 p-4 bg-white/50 rounded-lg">
                            <p className="text-sm text-green-800 leading-relaxed">{analysis.notes}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
