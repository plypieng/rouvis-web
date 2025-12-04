'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
    format,
    startOfYear,
    endOfYear,
    eachMonthOfInterval,
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    isSameDay,
    isWithinInterval,
    addYears,
    subYears,
    getDay,
    isToday
} from 'date-fns';
import { ja } from 'date-fns/locale';

interface Task {
    id: string;
    title: string;
    dueDate: string;
    status: string;
}

interface ProjectYearViewProps {
    startDate: string;
    targetHarvestDate?: string;
    tasks: Task[];
}

export default function ProjectYearView({ startDate, targetHarvestDate, tasks }: ProjectYearViewProps) {
    const t = useTranslations('projects.calendar');
    const [currentYear, setCurrentYear] = useState(new Date(startDate).getFullYear());

    const yearStart = startOfYear(new Date(currentYear, 0, 1));
    const yearEnd = endOfYear(new Date(currentYear, 0, 1));
    const months = eachMonthOfInterval({ start: yearStart, end: yearEnd });

    const projectStart = new Date(startDate);
    const projectEnd = targetHarvestDate ? new Date(targetHarvestDate) : null;

    const handlePrevYear = () => setCurrentYear(prev => prev - 1);
    const handleNextYear = () => setCurrentYear(prev => prev + 1);

    const getDayClass = (day: Date) => {
        let classes = "h-6 w-6 flex items-center justify-center text-[10px] rounded-full relative ";

        // Base text color
        if (getDay(day) === 0) classes += "text-red-500 "; // Sunday
        else if (getDay(day) === 6) classes += "text-blue-500 "; // Saturday
        else classes += "text-gray-700 ";

        // Today
        if (isToday(day)) {
            classes += "ring-1 ring-blue-500 font-bold ";
        }

        // Project Duration Highlight (Light Green Background)
        if (projectEnd && isWithinInterval(day, { start: projectStart, end: projectEnd })) {
            classes += "bg-green-50 ";
        }

        // Start Date
        if (isSameDay(day, projectStart)) {
            classes += "bg-green-600 text-white font-bold shadow-sm ";
        }

        // Harvest Date
        if (projectEnd && isSameDay(day, projectEnd)) {
            classes += "bg-orange-500 text-white font-bold shadow-sm ";
        }

        return classes;
    };

    const getTaskIndicator = (day: Date) => {
        const dayTasks = tasks.filter(task => isSameDay(new Date(task.dueDate), day));
        if (dayTasks.length === 0) return null;

        const hasPending = dayTasks.some(t => t.status !== 'completed');
        const color = hasPending ? 'bg-blue-500' : 'bg-green-500';

        return (
            <div className={`absolute -bottom-0.5 left-1/2 transform -translate-x-1/2 w-1 h-1 rounded-full ${color}`}></div>
        );
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-8">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <span className="material-symbols-outlined text-green-600">calendar_month</span>
                    {t('year_view')}
                </h2>
                <div className="flex items-center gap-4 bg-gray-50 rounded-lg p-1">
                    <button onClick={handlePrevYear} className="p-1 hover:bg-white hover:shadow-sm rounded-md transition text-gray-500">
                        <span className="material-symbols-outlined text-lg">chevron_left</span>
                    </button>
                    <span className="font-bold text-gray-900 min-w-[60px] text-center">{currentYear}年</span>
                    <button onClick={handleNextYear} className="p-1 hover:bg-white hover:shadow-sm rounded-md transition text-gray-500">
                        <span className="material-symbols-outlined text-lg">chevron_right</span>
                    </button>
                </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 mb-6 text-xs text-gray-600 px-2">
                <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-green-600"></div>
                    <span>{t('start_date')}</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-orange-500"></div>
                    <span>{t('harvest_date')}</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
                    <span>{t('task_pending')}</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
                    <span>{t('task_completed')}</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full border border-blue-500"></div>
                    <span>{t('today')}</span>
                </div>
            </div>

            {/* Year Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-8">
                {months.map((month) => {
                    const monthStart = startOfMonth(month);
                    const monthEnd = endOfMonth(month);
                    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
                    const startDayOfWeek = getDay(monthStart); // 0 (Sun) - 6 (Sat)

                    return (
                        <div key={month.toISOString()} className="text-sm">
                            <h3 className="font-bold text-gray-900 mb-3 border-b border-gray-100 pb-1">
                                {format(month, 'M月', { locale: ja })}
                            </h3>

                            <div className="grid grid-cols-7 gap-y-1 text-center mb-1">
                                {['日', '月', '火', '水', '木', '金', '土'].map((d, i) => (
                                    <div key={d} className={`text-[10px] font-medium ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-400'}`}>
                                        {d}
                                    </div>
                                ))}
                            </div>

                            <div className="grid grid-cols-7 gap-y-1 justify-items-center">
                                {/* Empty cells for start of month */}
                                {Array.from({ length: startDayOfWeek }).map((_, i) => (
                                    <div key={`empty-${i}`} className="h-6 w-6"></div>
                                ))}

                                {/* Days */}
                                {days.map((day) => (
                                    <div key={day.toISOString()} className={getDayClass(day)}>
                                        {format(day, 'd')}
                                        {getTaskIndicator(day)}
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
