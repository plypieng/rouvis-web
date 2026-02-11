'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import ConversationalQA from './ConversationalQA';

type InputMethod = 'date' | 'photo' | 'conversation';

export default function PlantingHistoryInput({
    crop,
    onComplete
}: {
    crop: string;
    onComplete: (data: { plantingDate: string; confidence: string }) => void;
}) {
    const t = useTranslations('projects.plantingHistory');
    const [method, setMethod] = useState<InputMethod | null>(null);
    const [dateInput, setDateInput] = useState('');
    const [approximateDate, setApproximateDate] = useState('');
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const handleDateSubmit = () => {
        if (dateInput) {
            onComplete({ plantingDate: dateInput, confidence: 'high' });
        } else if (approximateDate) {
            const today = new Date();
            const daysAgo = parseInt(approximateDate);
            const estimatedDate = new Date(today); // Create a copy to avoid mutation
            estimatedDate.setDate(estimatedDate.getDate() - daysAgo);
            onComplete({
                plantingDate: estimatedDate.toISOString().split('T')[0],
                confidence: 'medium'
            });
        }
    };

    const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setErrorMessage(null);

        // Check file size (5MB limit)
        if (file.size > 5 * 1024 * 1024) {
            setErrorMessage('画像ファイルは5MB以下にしてください');
            return;
        }

        // Create preview
        const reader = new FileReader();
        reader.onloadend = () => {
            setPhotoPreview(reader.result as string);
        };
        reader.readAsDataURL(file);

        // Analyze photo
        setAnalyzing(true);
        try {
            const base64 = await fileToBase64(file);
            const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
            const res = await fetch(`${baseUrl}/api/v1/agents/analyze-plant-photo`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ crop, image: base64 }),
            });

            if (res.ok) {
                const result = await res.json();
                onComplete({
                    plantingDate: result.suggestedPlantingDate,
                    confidence: result.confidence
                });
            } else {
                const error = await res.json();
                setErrorMessage(`分析に失敗しました: ${error.message || error.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Photo analysis error:', error);
            setErrorMessage('写真の分析中にエラーが発生しました。もう一度お試しください。');
        } finally {
            setAnalyzing(false);
        }
    };

    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const base64 = (reader.result as string).split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };



    const handleConversationalComplete = (estimatedDate: string) => {
        onComplete({ plantingDate: estimatedDate, confidence: 'medium' });
    };

    // Reset to selection
    const handleBack = () => {
        setMethod(null);
    };

    if (method === 'conversation') {
        return (
            <div className="space-y-4">
                <button
                    onClick={handleBack}
                    className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                >
                    <span className="material-symbols-outlined text-sm">arrow_back</span>
                    {t('back')}
                </button>
                <ConversationalQA crop={crop} onComplete={handleConversationalComplete} />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="text-center">
                <h3 className="text-xl font-bold text-gray-900 mb-2">{t('title')}</h3>
                <p className="text-gray-600">{t('description')}</p>
            </div>

            {errorMessage && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {errorMessage}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Method A: Date Input */}
                <div className="bg-white p-6 rounded-xl border-2 border-gray-100 hover:border-green-500 transition-all">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                            <span className="material-symbols-outlined text-green-600">calendar_today</span>
                        </div>
                        <h4 className="font-bold text-gray-900">{t('exactDate')}</h4>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t('selectDate')}
                            </label>
                            <input
                                type="date"
                                value={dateInput}
                                onChange={(e) => {
                                    setDateInput(e.target.value);
                                    setApproximateDate('');
                                }}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            />
                        </div>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-200"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-white text-gray-500">{t('or')}</span>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t('approximate')}
                            </label>
                            <select
                                value={approximateDate}
                                onChange={(e) => {
                                    setApproximateDate(e.target.value);
                                    setDateInput('');
                                }}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            >
                                <option value="">{t('selectApproximate')}</option>
                                <option value="7">{t('oneWeekAgo')}</option>
                                <option value="30">{t('oneMonthAgo')}</option>
                                <option value="60">{t('twoMonthsAgo')}</option>
                                <option value="90">{t('threeMonthsAgo')}</option>
                            </select>
                        </div>

                        <button
                            onClick={handleDateSubmit}
                            disabled={!dateInput && !approximateDate}
                            className="w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 font-medium"
                        >
                            {t('confirmDate')}
                        </button>
                    </div>
                </div>

                {/* Method B & C: AI Assistance */}
                <div className="space-y-4">
                    {/* Photo Upload */}
                    <div className="bg-white border-2 border-blue-100 rounded-xl p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                <span className="material-symbols-outlined text-blue-600">add_a_photo</span>
                            </div>
                            <h4 className="font-bold text-gray-900">{t('uploadPhoto')}</h4>
                        </div>
                        <p className="text-sm text-gray-600 mb-4">{t('photoHelp')}</p>

                        <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={handlePhotoChange}
                            className="hidden"
                            id="photo-upload"
                            disabled={analyzing}
                        />
                        <label
                            htmlFor="photo-upload"
                            className={`block w-full py-3 px-4 bg-blue-600 text-white text-center rounded-lg hover:bg-blue-700 transition cursor-pointer ${analyzing ? 'opacity-50 cursor-not-allowed' : ''
                                }`}
                        >
                            {analyzing ? '分析中...' : '写真を撮る'}
                        </label>

                        {photoPreview && (
                            <div className="mt-4">
                                <img
                                    src={photoPreview}
                                    alt="Plant preview"
                                    className="w-full h-48 object-cover rounded-lg"
                                />
                            </div>
                        )}

                        {analyzing && (
                            <div className="mt-4 flex items-center gap-2 text-blue-600">
                                <div className="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                                <span className="text-sm">AIが植物を分析中...</span>
                            </div>
                        )}
                    </div>

                    {/* Conversational Q&A */}
                    <button
                        onClick={() => setMethod('conversation')}
                        className="w-full p-6 bg-white border-2 border-purple-100 rounded-xl hover:border-purple-500 transition-all text-left flex items-start gap-4 group"
                    >
                        <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0 group-hover:bg-purple-200 transition">
                            <span className="material-symbols-outlined text-purple-600">chat_bubble</span>
                        </div>
                        <div>
                            <h4 className="font-bold text-gray-900 mb-1">{t('askAI')}</h4>
                            <p className="text-sm text-gray-600">{t('askAIHelp')}</p>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
}
