'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { format, addMonths, subMonths, addYears, subYears } from 'date-fns';
import { ja } from 'date-fns/locale';
import MonthGrid from './calendar/MonthGrid';
import ProjectYearView from './ProjectYearView'; // Reusing existing Year View
import TaskSidePanel from './calendar/TaskSidePanel';
import ProjectInsightsPanel from './ProjectInsightsPanel';

interface Task {
    id: string;
    title: string;
    description?: string;
    dueDate: string;
    status: string;
}

interface ProjectCalendarProps {
    startDate: string;
    targetHarvestDate?: string;
    tasks: Task[];
    project: {
        id: string;
        crop: string;
        currentStage?: string;
    };
    onRescheduleRequest?: (message?: string) => void;
    // onAskAI deprecated in favor of onRescheduleRequest, but kept for compatibility if needed.
    onAskAI?: () => void;
    onTaskComplete?: (taskId: string, status: string) => void;
    onTaskCreate?: (date: Date) => void;
}

type RescheduleSuggestion = {
    summary: string;
    prompt: string;
    affectedTasks?: Array<{ id: string; title: string; dueDate: string }>;
};

export default function ProjectCalendar({
    startDate,
    targetHarvestDate,
    tasks,
    project,
    onRescheduleRequest,
    onAskAI,
    onTaskComplete,
    onTaskCreate
}: ProjectCalendarProps) {
    const t = useTranslations('projects.calendar');

    const [view, setView] = useState<'month' | 'year'>('month');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [showAdvice, setShowAdvice] = useState(false);
    const [rescheduleSuggestion, setRescheduleSuggestion] = useState<RescheduleSuggestion | null>(null);

    const taskSignature = tasks.map(task => `${task.id}:${task.dueDate}:${task.status}`).join('|');

    useEffect(() => {
        let isActive = true;
        const fetchSuggestion = async () => {
            try {
                const res = await fetch(`/api/v1/projects/${project.id}/reschedule-suggestion`);
                if (!res.ok) return;
                const data = await res.json();
                if (!isActive) return;
                setRescheduleSuggestion(data.suggestion || null);
            } catch (error) {
                console.warn('Failed to fetch reschedule suggestion:', error);
            }
        };
        fetchSuggestion();
        return () => { isActive = false; };
    }, [project.id, taskSignature]);

    const handlePrev = () => {
        if (view === 'month') setCurrentDate(prev => subMonths(prev, 1));
        else setCurrentDate(prev => subYears(prev, 1));
    };

    const handleNext = () => {
        if (view === 'month') setCurrentDate(prev => addMonths(prev, 1));
        else setCurrentDate(prev => addYears(prev, 1));
    };

    // const handleToday = () => {
    //     const today = new Date();
    //     setCurrentDate(today);
    //     setSelectedDate(today);
    // };

    return (

        <div className="flex flex-col h-full">
            {/* Main Content Area - Split View */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
                {/* Left: Calendar Main Area (Header + Grid) */}
                <div className="lg:col-span-2 h-full flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    {rescheduleSuggestion && (
                        <div className="flex items-center justify-between gap-3 px-4 py-2 bg-amber-50 border-b border-amber-100 text-amber-900 text-xs">
                            <div className="flex items-start gap-2">
                                <span className="material-symbols-outlined text-[16px] text-amber-600">event_busy</span>
                                <div className="flex-1">
                                    <p className="font-semibold">AIスケジュール提案</p>
                                    <p className="text-amber-800/80">{rescheduleSuggestion.summary}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => onRescheduleRequest?.(rescheduleSuggestion.prompt)}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-bold bg-white border border-amber-300 text-amber-700 hover:bg-amber-100 transition"
                            >
                                <span className="material-symbols-outlined text-[16px]">smart_toy</span>
                                <span>AIに相談</span>
                            </button>
                        </div>
                    )}
                    {/* Integrated Header */}
                    <div className="grid grid-cols-12 items-center px-3 py-2 border-b border-gray-100 bg-white z-20 relative min-h-[52px]">
                        {/* Left: View Switcher */}
                        <div className="col-span-4 flex justify-start">
                            <div className="flex bg-gray-100 p-0.5 rounded-lg">
                                <button
                                    onClick={() => setView('month')}
                                    className={`px-2 py-1 text-[11px] font-medium rounded-md transition ${view === 'month' ? 'bg-white shadow text-green-700' : 'text-gray-500 hover:text-gray-900'}`}
                                >
                                    {t('view_month')}
                                </button>
                                <button
                                    onClick={() => setView('year')}
                                    className={`px-2 py-1 text-[11px] font-medium rounded-md transition ${view === 'year' ? 'bg-white shadow text-green-700' : 'text-gray-500 hover:text-gray-900'}`}
                                >
                                    {t('view_year')}
                                </button>
                            </div>
                        </div>

                        {/* Center: Date Navigation */}
                        <div className="col-span-4 flex justify-center items-center gap-1">
                            <button onClick={handlePrev} className="p-0.5 hover:bg-gray-100 rounded-full transition text-gray-400 hover:text-gray-600">
                                <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                            </button>
                            <h2 className="text-sm font-bold text-gray-800 tracking-tight min-w-[80px] text-center">
                                {view === 'month'
                                    ? format(currentDate, 'yyyy年 M月', { locale: ja })
                                    : format(currentDate, 'yyyy年', { locale: ja })
                                }
                            </h2>
                            <button onClick={handleNext} className="p-0.5 hover:bg-gray-100 rounded-full transition text-gray-400 hover:text-gray-600">
                                <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                            </button>
                        </div>

                        {/* Right: AI Buttons */}
                        <div className="col-span-4 flex justify-end gap-2">
                            {/* Chat / Reschedule Button */}
                            <button
                                onClick={() => onRescheduleRequest?.()}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-bold transition shadow-sm bg-white border border-green-600 text-green-700 hover:bg-green-50"
                            >
                                <span className="material-symbols-outlined text-[16px]">smart_toy</span>
                                <span className="hidden sm:inline">{t('ask_ai_reschedule')}</span>
                            </button>

                            {/* Insights Button */}
                            <button
                                onClick={() => setShowAdvice(true)}
                                className="flex items-center justify-center w-8 h-8 rounded-full transition shadow-sm bg-indigo-50 border border-indigo-200 text-indigo-600 hover:bg-indigo-100"
                                title={t('view_insights')}
                            >
                                <span className="material-symbols-outlined text-[18px]">lightbulb</span>
                            </button>
                        </div>
                    </div>

                    {/* AI Insights Modal */}
                    {showAdvice && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm" onClick={() => setShowAdvice(false)}>
                            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                                <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-gray-100 bg-white/95 backdrop-blur">
                                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-indigo-600">auto_awesome</span>
                                        {t('ai_insights_title')}
                                    </h3>
                                    <button onClick={() => setShowAdvice(false)} className="p-1 hover:bg-gray-100 rounded-full transition">
                                        <span className="material-symbols-outlined text-gray-500">close</span>
                                    </button>
                                </div>
                                <div className="p-6">
                                    <ProjectInsightsPanel
                                        project={{
                                            id: project.id,
                                            crop: project.crop,
                                            stage: project.currentStage
                                        }}
                                        onAskAI={() => {
                                            setShowAdvice(false);
                                            if (onRescheduleRequest) onRescheduleRequest();
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Grid Content */}
                    <div className="flex-1 relative z-0">
                        {view === 'month' ? (
                            <MonthGrid
                                currentDate={currentDate}
                                selectedDate={selectedDate}
                                onSelectDate={setSelectedDate}
                                tasks={tasks}
                                startDate={startDate}
                                targetHarvestDate={targetHarvestDate}
                            />
                        ) : (
                            <div className="h-full">
                                <ProjectYearView
                                    startDate={startDate}
                                    targetHarvestDate={targetHarvestDate}
                                    tasks={tasks}
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Side Panel */}
                <div className="lg:col-span-1 h-full">
                    <TaskSidePanel
                        selectedDate={selectedDate}
                        tasks={tasks}
                        onAddTask={onTaskCreate}
                        onTaskComplete={onTaskComplete}
                    />
                </div>
            </div>
        </div>
    );
}
