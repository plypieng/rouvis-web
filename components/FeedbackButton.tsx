'use client';

import { useState } from 'react';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';

export default function FeedbackButton() {
    const [isOpen, setIsOpen] = useState(false);
    const [feedback, setFeedback] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!feedback.trim()) return;

        setIsSubmitting(true);

        try {
            // For alpha, just log to console and show success
            // In production, this would POST to /api/v1/feedback
            console.log('[Feedback]', feedback);

            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 500));

            setSubmitted(true);
            setFeedback('');

            // Auto-close after 2 seconds
            setTimeout(() => {
                setIsOpen(false);
                setSubmitted(false);
            }, 2000);
        } catch (error) {
            console.error('Failed to submit feedback:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            {/* Floating Button */}
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105"
                aria-label="フィードバックを送る"
            >
                <MessageCircle className="w-6 h-6" />
            </button>

            {/* Modal Overlay */}
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/40"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Modal */}
                    <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md mx-0 sm:mx-4 p-6 animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 duration-300">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">
                                ご意見・問題報告
                            </h3>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-gray-400 hover:text-gray-600 p-1"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {submitted ? (
                            // Success State
                            <div className="text-center py-8">
                                <div className="text-4xl mb-3">✅</div>
                                <p className="text-gray-900 font-medium">
                                    ありがとうございます！
                                </p>
                                <p className="text-sm text-gray-500 mt-1">
                                    フィードバックを受け付けました
                                </p>
                            </div>
                        ) : (
                            // Form
                            <form onSubmit={handleSubmit}>
                                <p className="text-sm text-gray-500 mb-3">
                                    使いにくい点や改善のアイデアがあれば、お気軽にお知らせください。
                                </p>

                                <textarea
                                    value={feedback}
                                    onChange={(e) => setFeedback(e.target.value)}
                                    placeholder="例：「作物の写真をアップロードできない」「ボタンが小さくて押しにくい」など"
                                    className="w-full h-32 p-3 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-gray-900 placeholder:text-gray-400"
                                    autoFocus
                                />

                                <button
                                    type="submit"
                                    disabled={!feedback.trim() || isSubmitting}
                                    className="w-full mt-4 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            送信中...
                                        </>
                                    ) : (
                                        <>
                                            <Send className="w-4 h-4" />
                                            送信する
                                        </>
                                    )}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
