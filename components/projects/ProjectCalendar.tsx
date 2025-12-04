'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { format, addMonths, subMonths, addYears, subYears } from 'date-fns';
import { ja } from 'date-fns/locale';
import MonthGrid from './calendar/MonthGrid';
import ProjectYearView from './ProjectYearView'; // Reusing existing Year View
import TaskSidePanel from './calendar/TaskSidePanel';

interface Task {
    id: string;
    title: string;
    dueDate: string;
    status: string;
}

interface ProjectCalendarProps {
    startDate: string;
    targetHarvestDate?: string;
    tasks: Task[];
    onAiReschedule?: () => void;
    onTaskComplete?: (taskId: string, status: string) => void;
    onTaskCreate?: (date: Date) => void;
}

export default function ProjectCalendar({
    startDate,
    targetHarvestDate,
    tasks,
    onAiReschedule,
    onTaskComplete,
    onTaskCreate
}: ProjectCalendarProps) {
    const t = useTranslations('projects.calendar');

    const [view, setView] = useState<'month' | 'year'>('month');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());

    const handlePrev = () => {
        if (view === 'month') setCurrentDate(prev => subMonths(prev, 1));
        else setCurrentDate(prev => subYears(prev, 1));
    };

    const handleNext = () => {
        if (view === 'month') setCurrentDate(prev => addMonths(prev, 1));
        else setCurrentDate(prev => addYears(prev, 1));
    };

    const handleToday = () => {
        const today = new Date();
        setCurrentDate(today);
        setSelectedDate(today);
    };

    return (
        <div className="flex flex-col h-full gap-4">
            {/* Calendar Header */}
            <div className="flex flex-wrap justify-between items-center gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        <button
                            onClick={() => setView('month')}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${view === 'month' ? 'bg-white shadow text-green-700' : 'text-gray-500 hover:text-gray-900'}`}
                        >
                            {t('view_month')}
                        </button>
                        <button
                            onClick={() => setView('year')}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${view === 'year' ? 'bg-white shadow text-green-700' : 'text-gray-500 hover:text-gray-900'}`}
                        >
                            {t('view_year')}
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        <button onClick={handlePrev} className="p-1 hover:bg-gray-100 rounded-full transition">
                            <span className="material-symbols-outlined text-gray-600">chevron_left</span>
                        </button>
                        <h2 className="text-lg font-bold text-gray-900 min-w-[140px] text-center">
                            {view === 'month'
                                ? format(currentDate, 'yyyy年 M月', { locale: ja })
                                : format(currentDate, 'yyyy年', { locale: ja })
                            }
                        </h2>
                        <button onClick={handleNext} className="p-1 hover:bg-gray-100 rounded-full transition">
                            <span className="material-symbols-outlined text-gray-600">chevron_right</span>
                        </button>
                    </div>

                    <button onClick={handleToday} className="text-sm font-medium text-gray-500 hover:text-green-600 transition">
                        {t('today')}
                    </button>
                </div>

                {/* AI Reschedule Button */}
                <button
                    onClick={onAiReschedule}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-lg shadow-md hover:shadow-lg transition transform hover:-translate-y-0.5"
                >
                    <span className="material-symbols-outlined text-lg">smart_toy</span>
                    <span className="font-bold text-sm">{t('ask_ai_reschedule')}</span>
                </button>
            </div>

            {/* Main Content Area - Split View */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[600px]">
                {/* Left: Calendar Grid */}
                <div className="lg:col-span-2 h-full">
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
                        <div className="h-full overflow-y-auto">
                            <ProjectYearView
                                startDate={startDate}
                                targetHarvestDate={targetHarvestDate}
                                tasks={tasks}
                            />
                        </div>
                    )}
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
