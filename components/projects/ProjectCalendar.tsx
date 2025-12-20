'use client';

import { useState } from 'react';
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
    onAskAI?: () => void;
    onTaskComplete?: (taskId: string, status: string) => void;
    onTaskCreate?: (date: Date) => void;
}

export default function ProjectCalendar({
    startDate,
    targetHarvestDate,
    tasks,
    project,
    onAskAI,
    onTaskComplete,
    onTaskCreate
}: ProjectCalendarProps) {
    const t = useTranslations('projects.calendar');

    const [view, setView] = useState<'month' | 'year'>('month');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [showAdvice, setShowAdvice] = useState(false);

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

                        {/* Right: AI Button */}
                        <div className="col-span-4 flex justify-end">
                            <button
                                onClick={() => setShowAdvice(!showAdvice)}
                                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition shadow-sm border ${showAdvice ? 'bg-green-50 border-green-200 text-green-700' : 'bg-white border-green-600 text-green-700 hover:bg-green-50'}`}
                            >
                                <span className="material-symbols-outlined text-[14px]">smart_toy</span>
                                <span>{t('ask_ai_reschedule')}</span>
                                <span className="material-symbols-outlined text-[14px]">
                                    {showAdvice ? 'expand_less' : 'expand_more'}
                                </span>
                            </button>
                        </div>
                    </div>

                    {/* AI Insights Panel (Collapsible) */}
                    <div className={`transition-all duration-300 ease-in-out relative z-10 bg-gray-50/50 ${showAdvice ? 'max-h-[500px] border-b border-gray-100' : 'max-h-0 overflow-hidden'}`}>
                        <div className="p-4">
                            <ProjectInsightsPanel
                                project={{
                                    id: project.id,
                                    crop: project.crop,
                                    stage: project.currentStage
                                }}
                                onAskAI={onAskAI || (() => { })}
                            />
                        </div>
                    </div>

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
