'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useRouter } from 'next/navigation';


export default function ProjectAgentOnboarding({
    projectId,
    crop,
    startDate,
    onGenerate
}: {
    projectId: string;
    crop: string;
    startDate?: string;
    onGenerate?: () => void;
}) {
    const t = useTranslations('projects.agent_onboarding');
    const [isGenerating, setIsGenerating] = useState(false);
    const [progressMessage, setProgressMessage] = useState('');
    const router = useRouter();

    const handleGenerate = async () => {
        setIsGenerating(true);
        try {
            const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';

            setProgressMessage('🤖 スケジュール生成を開始します...');

            // 1. Determine which endpoint to use based on start date
            const isBackfilled = startDate && new Date(startDate) < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            const endpoint = isBackfilled
                ? '/api/v1/agents/generate-backfilled-schedule'
                : '/api/v1/agents/generate-schedule';

            setProgressMessage(`📊 ${crop}の栽培計画を分析中...`);

            // 2. Generate Schedule
            const genRes = await fetch(`${baseUrl}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(isBackfilled ? {
                    cropAnalysis: {
                        crop,
                        startDate: startDate || new Date().toISOString().split('T')[0],
                        targetHarvestDate: ''
                    },
                    plantingDate: startDate,
                    currentDate: new Date().toISOString().split('T')[0],
                } : {
                    cropAnalysis: {
                        crop,
                        startDate: startDate || new Date().toISOString().split('T')[0],
                        targetHarvestDate: ''
                    },
                    currentDate: new Date().toISOString().split('T')[0],
                    userId: 'demo-user',
                }),
            });

            if (!genRes.ok) throw new Error('Failed to generate schedule');
            const generatedData = await genRes.json();

            setProgressMessage('🌱 タスクを作成中...');

            // 3. Process Tasks
            let tasks: any[] = [];
            if (isBackfilled) {
                const pastTasks = generatedData.schedule.pastTasks.flatMap((w: any) =>
                    w.tasks.map((t: any) => ({ ...t, status: 'completed', isBackfilled: true }))
                );
                const currentTasks = generatedData.schedule.currentWeekTasks.map((t: any) => ({ ...t, status: 'pending' }));
                const futureTasks = generatedData.schedule.futureTasks.flatMap((w: any) =>
                    w.tasks.map((t: any) => ({ ...t, status: 'pending' }))
                );
                tasks = [...pastTasks, ...currentTasks, ...futureTasks];
            } else {
                tasks = generatedData.schedule.weeks.flatMap((week: any) =>
                    week.tasks.map((task: any) => ({
                        title: task.title,
                        description: task.description,
                        dueDate: task.dueDate,
                        priority: task.priority,
                        status: 'pending',
                    }))
                );
            }

            setProgressMessage(`💾 ${tasks.length}個のタスクを保存中...`);

            // 4. Save Tasks to Project
            const saveRes = await fetch(`${baseUrl}/api/v1/projects/${projectId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tasks }),
            });

            if (!saveRes.ok) throw new Error('Failed to save tasks');

            setProgressMessage('✅ スケジュール生成が完了しました！');

            // 5. Refresh Page
            setTimeout(() => {
                router.refresh();
                if (onGenerate) onGenerate();
            }, 500);

        } catch (error) {
            console.error('Generation error:', error);
            setProgressMessage('');
            alert('スケジュールの生成に失敗しました');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 border-2 border-blue-100 text-center max-w-2xl mx-auto my-8">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-md">
                <span className="material-symbols-outlined text-4xl text-blue-600">smart_toy</span>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-3">
                {t('welcome_title', { crop })}
            </h2>

            <p className="text-gray-600 mb-8 leading-relaxed">
                {t('welcome_message')}
            </p>

            {/* Progress Message */}
            {progressMessage && (
                <div className="mb-6 p-4 bg-white/80 backdrop-blur rounded-lg border border-blue-200 text-sm text-gray-700 font-medium animate-pulse">
                    {progressMessage}
                </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="px-8 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition shadow-lg hover:shadow-xl flex items-center justify-center gap-2 font-bold disabled:bg-blue-400 disabled:cursor-not-allowed"
                >
                    {isGenerating ? (
                        <>
                            <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                            {t('generating')}
                        </>
                    ) : (
                        <>
                            <span className="material-symbols-outlined">auto_awesome</span>
                            {t('generate_schedule')}
                        </>
                    )}
                </button>

                <button
                    className="px-8 py-3 bg-white text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition flex items-center justify-center gap-2 font-medium"
                    disabled={isGenerating}
                >
                    <span className="material-symbols-outlined">edit_calendar</span>
                    {t('customize_manually')}
                </button>
            </div>
        </div>
    );
}
