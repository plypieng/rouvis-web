import React from 'react';
import { X, AlertTriangle, CheckCircle, Info, Droplets, Sprout, Bug } from 'lucide-react';

export interface DiagnosisAction {
    type: 'pesticide' | 'water' | 'fertilizer' | 'other';
    title: string;
    description: string;
    products?: string[];
}

export interface DiagnosisResult {
    imageUrl?: string;
    diagnosis: string;
    scientificName?: string;
    confidence: number;
    severity: 'low' | 'medium' | 'high';
    impact: 'limited' | 'widespread';
    description: string;
    actions: DiagnosisAction[];
    timestamp: string;
}

interface DiagnosisReportProps {
    result: DiagnosisResult;
    onClose: () => void;
}

export function DiagnosisReport({ result, onClose }: DiagnosisReportProps) {
    const getSeverityColor = (s: string) => {
        switch (s) {
            case 'high': return 'text-red-600 bg-red-50 border-red-100';
            case 'medium': return 'text-orange-600 bg-orange-50 border-orange-100';
            default: return 'text-yellow-600 bg-yellow-50 border-yellow-100';
        }
    };

    const getActionIcon = (type: string) => {
        switch (type) {
            case 'pesticide': return <Bug className="w-5 h-5 text-red-500" />;
            case 'water': return <Droplets className="w-5 h-5 text-blue-500" />;
            case 'fertilizer': return <Sprout className="w-5 h-5 text-green-500" />;
            default: return <Info className="w-5 h-5 text-gray-500" />;
        }
    };

    return (
        <div className="h-full flex flex-col bg-white border-l border-gray-200 shadow-xl overflow-hidden w-full md:w-[400px] lg:w-[450px]">
            {/* Header */}
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
                <div>
                    <h2 className="font-bold text-lg text-gray-900">作物ビジョン診断結果</h2>
                    <p className="text-xs text-gray-500">{new Date(result.timestamp).toLocaleString()}</p>
                </div>
                <button
                    onClick={onClose}
                    className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Image */}
                {result.imageUrl && (
                    <div className="rounded-xl overflow-hidden border border-gray-200 bg-gray-50 aspect-video relative">
                        <img
                            src={result.imageUrl}
                            alt="Diagnosis Target"
                            className="w-full h-full object-contain"
                        />
                    </div>
                )}

                {/* Main Diagnosis */}
                <div className="border-2 border-red-100 rounded-xl p-4 bg-white shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                        <div>
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">害虫被害</span>
                            <h3 className="text-2xl font-bold text-red-600 mt-1">{result.diagnosis}</h3>
                            {result.scientificName && (
                                <p className="text-sm text-gray-500 italic">{result.scientificName}</p>
                            )}
                        </div>
                        <div className="text-right">
                            <span className="text-xs text-gray-500 block">信頼度</span>
                            <span className="text-xl font-bold text-gray-900">{result.confidence}%</span>
                        </div>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4">
                    <div className={`p-3 rounded-lg border ${getSeverityColor(result.severity)}`}>
                        <span className="text-xs font-medium opacity-80 block mb-1">被害の深刻度</span>
                        <span className="text-lg font-bold">
                            {result.severity === 'high' ? '深刻' : result.severity === 'medium' ? '中程度' : '軽微'}
                        </span>
                    </div>
                    <div className="p-3 rounded-lg border border-gray-200 bg-gray-50">
                        <span className="text-xs font-medium text-gray-500 block mb-1">影響範囲</span>
                        <span className="text-lg font-bold text-gray-900">
                            {result.impact === 'widespread' ? '広範囲' : '限定的'}
                        </span>
                    </div>
                </div>

                {/* Description */}
                <div className="text-sm text-gray-600 leading-relaxed bg-gray-50 p-4 rounded-lg">
                    {result.description}
                </div>

                {/* Actions */}
                <div>
                    <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        推奨されるアクション
                    </h4>
                    <div className="space-y-3">
                        {result.actions.map((action, idx) => (
                            <div key={idx} className="border border-gray-200 rounded-xl p-4 bg-white hover:border-green-200 transition-colors">
                                <div className="flex gap-3">
                                    <div className="mt-1 flex-shrink-0">
                                        {getActionIcon(action.type)}
                                    </div>
                                    <div className="flex-1">
                                        <h5 className="font-bold text-gray-900 text-sm mb-1">{action.title}</h5>
                                        <p className="text-sm text-gray-600 mb-3">{action.description}</p>

                                        {action.products && action.products.length > 0 && (
                                            <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                                                <span className="text-xs font-bold text-green-700 block mb-2">推奨製品 (例)</span>
                                                <div className="flex flex-wrap gap-2">
                                                    {action.products.map((prod, pIdx) => (
                                                        <span key={pIdx} className="px-2 py-1 bg-white border border-green-200 text-green-800 text-xs rounded font-medium shadow-sm">
                                                            {prod}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
