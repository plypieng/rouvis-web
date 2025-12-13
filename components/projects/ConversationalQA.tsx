'use client';

import { useState } from 'react';

type Question = {
    id: string;
    text: string;
    options: {
        value: string;
        label: string;
        ageHintMin: number;
        ageHintMax: number;
    }[];
};

export default function ConversationalQA({
    crop,
    onComplete
}: {
    crop: string;
    onComplete: (estimatedDate: string) => void;
}) {
    type AnswerOption = Question['options'][number];

    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, AnswerOption>>({});
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(false);

    // Fetch questions on mount
    const fetchQuestions = async () => {
        setFetching(true);
        try {
            const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
            const res = await fetch(`${baseUrl}/api/v1/agents/get-conversational-questions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ crop }),
            });

            if (res.ok) {
                const data = await res.json();
                setQuestions(data.questions || []);
            }
        } catch (error) {
            console.error('Failed to fetch questions:', error);
        } finally {
            setFetching(false);
        }
    };

    // Start conversation
    const handleStart = () => {
        fetchQuestions();
    };

    // Answer question
    const handleAnswer = (questionId: string, option: AnswerOption) => {
        const newAnswers = { ...answers, [questionId]: option };
        setAnswers(newAnswers);

        // Move to next question or finish
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
        } else {
            submitAnswers(newAnswers);
        }
    };

    // Submit all answers to get estimated date
    const submitAnswers = async (finalAnswers: Record<string, AnswerOption>) => {
        setLoading(true);
        try {
            const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
            const res = await fetch(`${baseUrl}/api/v1/agents/estimate-planting-date`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ crop, answers: finalAnswers }),
            });

            if (res.ok) {
                const data = await res.json();
                onComplete(data.suggestedPlantingDate);
            } else {
                throw new Error('Failed to estimate date');
            }
        } catch (error) {
            console.error('Failed to estimate date:', error);
            alert('植付け日の推定に失敗しました。もう一度お試しください。');
            setLoading(false);
        }
    };

    if (questions.length === 0) {
        return (
            <div className="bg-white border-2 border-purple-200 rounded-xl p-8 text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="material-symbols-outlined text-3xl text-purple-600">chat</span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">AI に質問してもらう</h3>
                <p className="text-sm text-gray-600 mb-6">
                    簡単な質問に答えて、植付け時期を特定します
                </p>
                <button
                    onClick={handleStart}
                    disabled={fetching}
                    className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50"
                >
                    {fetching ? '読み込み中...' : '開始する'}
                </button>
                {fetching && <p className="text-sm text-purple-600 mt-2">質問を生成中...</p>}
            </div>
        );
    }

    if (loading) {
        return (
            <div className="bg-white border-2 border-purple-200 rounded-xl p-8 text-center">
                <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-purple-700 font-medium">植付け日を計算中...</p>
            </div>
        );
    }

    const currentQuestion = questions[currentQuestionIndex];

    return (
        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border-2 border-purple-200 rounded-xl p-8">
            <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-medium text-purple-700">
                        質問 {currentQuestionIndex + 1} / {questions.length}
                    </span>
                    <div className="flex gap-1">
                        {questions.map((_, idx) => (
                            <div
                                key={idx}
                                className={`w-2 h-2 rounded-full ${idx <= currentQuestionIndex ? 'bg-purple-600' : 'bg-purple-200'
                                    }`}
                            />
                        ))}
                    </div>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">
                    {currentQuestion.text}
                </h3>
                <p className="text-sm text-gray-600">
                    {crop}の状態について教えてください
                </p>
            </div>

            <div className="space-y-3">
                {currentQuestion.options.map((option) => (
                    <button
                        key={option.value}
                        onClick={() => handleAnswer(currentQuestion.id, option)}
                        className="w-full p-4 bg-white border-2 border-purple-100 rounded-lg text-left hover:border-purple-500 hover:shadow-md transition-all group"
                    >
                        <span className="text-gray-900 font-medium group-hover:text-purple-700">
                            {option.label}
                        </span>
                    </button>
                ))}
            </div>

            {currentQuestionIndex > 0 && (
                <button
                    onClick={() => setCurrentQuestionIndex(currentQuestionIndex - 1)}
                    className="mt-4 text-sm text-purple-600 hover:text-purple-800 underline"
                >
                    前の質問に戻る
                </button>
            )}
        </div>
    );
}
