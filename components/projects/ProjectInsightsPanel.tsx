'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';


interface ProjectInsightsPanelProps {
    project: {
        id: string;
        crop: string;
        stage?: string;
    };
    onAskAI: () => void;
}

type AdviceBlock = {
    status?: 'safe' | 'warning' | 'critical' | string;
    summary?: string;
    detail?: string;
    message?: string;
};

type AdviceTask = string | { summary?: string; detail?: string };

type Advice = {
    weatherImpact?: AdviceBlock;
    stageAdvice?: { summary?: string; detail?: string; message?: string };
    priorityTasks?: AdviceTask[];
};

export default function ProjectInsightsPanel({ project, onAskAI }: ProjectInsightsPanelProps) {
    const t = useTranslations('projects.insights_panel');
    const [loading, setLoading] = useState(true);
    const [insights, setInsights] = useState<Advice | null>(null);

    useEffect(() => {
        const fetchAdvice = async () => {
            try {
                const res = await fetch('/api/v1/agents/advice', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ projectId: project.id }),
                });

                if (res.ok) {
                    const data = await res.json();
                    setInsights(data.advice);
                } else {
                    console.error('Advice fetch failed:', res.status, res.statusText);
                }
            } catch (error) {
                console.error('Failed to fetch advice:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchAdvice();
    }, [project.id]);

    const [expandedWeather, setExpandedWeather] = useState(false);
    const [expandedStage, setExpandedStage] = useState(false);
    const [expandedTasks, setExpandedTasks] = useState<number[]>([]);

    const toggleTaskExpansion = (index: number) => {
        setExpandedTasks(prev =>
            prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
        );
    };

    if (loading) {
        return (
            <div className="bg-white rounded-xl border border-gray-100 p-8 mb-6 shadow-sm flex justify-center items-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (!insights) {
        return (
            <div className="bg-white rounded-xl border border-gray-100 p-4 mb-6 shadow-sm text-center text-gray-500 text-sm">
                AIアドバイスの取得に失敗しました。
                <button
                    onClick={() => window.location.reload()}
                    className="ml-2 text-indigo-600 hover:underline"
                >
                    再読み込み
                </button>
            </div>
        );
    }

    return (
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-100 p-4 mb-6 shadow-sm">
            <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-indigo-600">auto_awesome</span>
                    <h3 className="font-bold text-indigo-900">{t('title')}</h3>
                </div>
                <button
                    onClick={onAskAI}
                    className="text-xs bg-white text-indigo-600 px-3 py-1.5 rounded-full border border-indigo-100 hover:bg-indigo-50 transition shadow-sm flex items-center gap-1 font-medium"
                >
                    <span className="material-symbols-outlined text-sm">chat</span>
                    {t('ask_ai')}
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Weather Impact - Expandable */}
                <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 border border-indigo-50">
                    <h4 className="text-xs font-bold text-gray-500 uppercase mb-1">{t('weather_impact')}</h4>
                    <div className="flex items-start gap-2 mb-2">
                        <span className={`material-symbols-outlined text-sm mt-0.5 ${insights.weatherImpact?.status === 'critical' ? 'text-red-500' :
                            insights.weatherImpact?.status === 'warning' ? 'text-orange-500' : 'text-green-500'
                            }`}>
                            {insights.weatherImpact?.status === 'critical' ? 'error' :
                                insights.weatherImpact?.status === 'warning' ? 'warning' : 'check_circle'}
                        </span>
                        <div className="flex-1">
                            <p className="text-sm text-gray-700">
                                {expandedWeather ? insights.weatherImpact?.detail : insights.weatherImpact?.summary || insights.weatherImpact?.message}
                            </p>
                        </div>
                    </div>
                    {insights.weatherImpact?.detail && (
                        <button
                            onClick={() => setExpandedWeather(!expandedWeather)}
                            className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 mt-1"
                        >
                            <span className="material-symbols-outlined text-sm">
                                {expandedWeather ? 'expand_less' : 'expand_more'}
                            </span>
                            {expandedWeather ? '閉じる' : '詳しく見る'}
                        </button>
                    )}
                </div>

                {/* Stage Advice - Expandable */}
                <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 border border-indigo-50">
                    <h4 className="text-xs font-bold text-gray-500 uppercase mb-1">{t('stage_advice')}</h4>
                    <p className="text-sm text-gray-700 whitespace-pre-line">
                        {expandedStage ? insights.stageAdvice?.detail : insights.stageAdvice?.summary || insights.stageAdvice?.message}
                    </p>
                    {insights.stageAdvice?.detail && (
                        <button
                            onClick={() => setExpandedStage(!expandedStage)}
                            className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 mt-2"
                        >
                            <span className="material-symbols-outlined text-sm">
                                {expandedStage ? 'expand_less' : 'expand_more'}
                            </span>
                            {expandedStage ? '閉じる' : '詳しく見る'}
                        </button>
                    )}
                </div>

                {/* Priority Tasks - Expandable */}
                <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 border border-indigo-50">
                    <h4 className="text-xs font-bold text-gray-500 uppercase mb-1">{t('priority_tasks')}</h4>
                    <ul className="space-y-2">
                        {Array.isArray(insights.priorityTasks) && insights.priorityTasks.map((task, index: number) => {
                            const isExpanded = expandedTasks.includes(index);
                            const taskText = typeof task === 'string'
                                ? task
                                : (isExpanded ? task.detail : task.summary) || '—';
                            const hasDetail = typeof task === 'object' && !!task?.detail;

                            return (
                                <li key={index} className="flex items-start gap-1.5">
                                    <span className="text-indigo-600 text-xs mt-0.5">•</span>
                                    <div className="flex-1">
                                        <span className="text-sm text-gray-700">{taskText}</span>
                                        {hasDetail && (
                                            <button
                                                onClick={() => toggleTaskExpansion(index)}
                                                className="text-xs text-indigo-600 hover:text-indigo-800 ml-1"
                                            >
                                                {isExpanded ? '▲' : '▼'}
                                            </button>
                                        )}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            </div>
        </div>
    );
}
