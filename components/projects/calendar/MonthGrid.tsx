'use client';

import { useTranslations } from 'next-intl';
import {
    format,
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    getDay,
    isSameDay,
    isToday
} from 'date-fns';
import { useMonthWeather } from '@/hooks/useMonthWeather';

interface Task {
    id: string;
    title: string;
    dueDate: string;
    status: string;
}

interface MonthGridProps {
    currentDate: Date;
    selectedDate: Date;
    onSelectDate: (date: Date) => void;
    tasks: Task[];
    startDate: string;
    targetHarvestDate?: string;
}

export default function MonthGrid({
    currentDate,
    selectedDate,
    onSelectDate,
    tasks,
    startDate,
    targetHarvestDate
}: MonthGridProps) {
    const t = useTranslations('projects.calendar');

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const startDayOfWeek = getDay(monthStart); // 0 (Sun) - 6 (Sat)

    const projectStart = new Date(startDate);
    const projectEnd = targetHarvestDate ? new Date(targetHarvestDate) : null;

    const { data: weatherData } = useMonthWeather(monthStart.getFullYear(), monthStart.getMonth() + 1);

    const getDayClass = (day: Date) => {
        let classes = "h-full min-h-[40px] p-1 border-b border-r border-gray-100 transition-colors relative cursor-pointer hover:bg-gray-50 flex flex-col ";

        // Selected State
        if (isSameDay(day, selectedDate)) {
            classes += "bg-blue-50 hover:bg-blue-50 ring-2 ring-inset ring-blue-400 z-10 ";
        }

        // Today
        if (isToday(day)) {
            classes += "bg-yellow-50/50 ";
        }

        return classes;
    };

    const getDateNumberClass = (day: Date) => {
        let classes = "text-sm font-medium w-6 h-6 flex items-center justify-center rounded-full mb-1 ";

        if (isSameDay(day, selectedDate)) {
            classes += "bg-blue-500 text-white ";
        } else if (isToday(day)) {
            classes += "bg-blue-100 text-blue-700 ";
        } else if (getDay(day) === 0) {
            classes += "text-red-500 ";
        } else if (getDay(day) === 6) {
            classes += "text-blue-500 ";
        } else {
            classes += "text-gray-700 ";
        }

        return classes;
    };

    const getTasksForDay = (day: Date) => {
        return tasks.filter(task => isSameDay(new Date(task.dueDate), day));
    };

    return (
        <div className="h-full flex flex-col">
            {/* Days Header */}
            <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
                {['日', '月', '火', '水', '木', '金', '土'].map((d, i) => (
                    <div key={d} className={`py-2 text-center text-xs font-bold ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-gray-500'}`}>
                        {d}
                    </div>
                ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 flex-1 auto-rows-fr">
                {/* Empty cells for start of month */}
                {Array.from({ length: startDayOfWeek }).map((_, i) => (
                    <div key={`empty-${i}`} className="border-b border-r border-gray-100 bg-gray-50/30"></div>
                ))}

                {/* Days */}
                {days.map((day) => {
                    const dayTasks = getTasksForDay(day);
                    const isStart = isSameDay(day, projectStart);
                    const isHarvest = projectEnd && isSameDay(day, projectEnd);
                    const dateKey = format(day, 'yyyy-MM-dd');
                    const weather = weatherData[dateKey];

                    return (
                        <div
                            key={day.toISOString()}
                            className={getDayClass(day)}
                            onClick={() => onSelectDate(day)}
                        >
                            <div className="flex justify-between items-start">
                                <span className={getDateNumberClass(day)}>
                                    {format(day, 'd')}
                                </span>
                                <div className="flex gap-0.5 items-center">
                                    {weather && (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={`https://openweathermap.org/img/wn/${weather.icon}.png`}
                                            alt={weather.condition}
                                            title={`${weather.condition} / ${weather.temperature.max}°C`}
                                            className="w-5 h-5 object-contain opacity-80"
                                        />
                                    )}
                                    {isStart && (
                                        <span className="material-symbols-outlined text-[14px] text-green-600" title={t('start_date')}>flag</span>
                                    )}
                                    {isHarvest && (
                                        <span className="material-symbols-outlined text-[14px] text-orange-500" title={t('harvest_date')}>agriculture</span>
                                    )}
                                </div>
                            </div>

                            {/* Task Indicators (Dots/Chips) */}
                            <div className="space-y-1 mt-1">
                                {dayTasks.slice(0, 3).map(task => (
                                    <div key={task.id} className={`text-[10px] px-1.5 py-0.5 rounded truncate ${task.status === 'completed'
                                        ? 'bg-gray-100 text-gray-500 line-through'
                                        : 'bg-blue-100 text-blue-700'
                                        }`}>
                                        {task.title}
                                    </div>
                                ))}
                                {dayTasks.length > 3 && (
                                    <div className="text-[10px] text-gray-400 pl-1">
                                        +{dayTasks.length - 3} more
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}

                {/* Fill remaining cells to complete the grid visually (optional, but looks better) */}
                {Array.from({ length: 42 - (startDayOfWeek + days.length) }).map((_, i) => (
                    <div key={`fill-${i}`} className="border-b border-r border-gray-100 bg-gray-50/30"></div>
                ))}
            </div>
        </div>
    );
}
