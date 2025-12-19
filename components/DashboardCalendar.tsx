'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import {
    format,
    addWeeks,
    subWeeks,
    startOfWeek,
    endOfWeek,
    addDays,
    subDays,
    isSameDay,
    isToday
} from 'date-fns';
import { ja } from 'date-fns/locale';

interface Task {
    id: string;
    title: string;
    dueAt: string; // ISO string
    projectName?: string;
    status: string;
}

interface ForecastDay {
    date: string;
    temperature: { min: number; max: number };
    condition: string;
    icon: string;
}

interface DashboardCalendarProps {
    tasks: Task[];
    locale: string;
    weatherForecast?: ForecastDay[];
}

export default function DashboardCalendar({ tasks, locale, weatherForecast = [] }: DashboardCalendarProps) {
    // Localization helper
    // Assuming 'dashboard' namespace or 'common'
    // For simplicity, hardcode labels or rely on simple date formatting

    const [currentDate, setCurrentDate] = useState(new Date());

    const handlePrev = () => setCurrentDate(prev => subDays(prev, 7));
    const handleNext = () => setCurrentDate(prev => addDays(prev, 7));
    const handleToday = () => setCurrentDate(new Date());

    // Generate 7 days starting from CURRENT DATE (Leftmost = Today/Start Date)
    const days = Array.from({ length: 7 }, (_, i) => addDays(currentDate, i));

    return (
        <div className="bg-card rounded-sm rounded-bl-none rounded-br-none border-2 border-gray-400 p-4 h-full">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">calendar_month</span>
                        {/* Show range month if spans months? Simple: Show Start Month */}
                        {format(currentDate, 'yyyy年 M月', { locale: ja })}
                    </h2>
                    <div className="flex bg-secondary rounded-lg p-0.5 ml-2">
                        <button onClick={handlePrev} className="p-1 hover:bg-background rounded-md transition-colors text-muted-foreground hover:text-foreground">
                            <span className="material-symbols-outlined text-lg">chevron_left</span>
                        </button>
                        <button onClick={handleNext} className="p-1 hover:bg-background rounded-md transition-colors text-muted-foreground hover:text-foreground">
                            <span className="material-symbols-outlined text-lg">chevron_right</span>
                        </button>
                    </div>
                    <button onClick={handleToday} className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors ml-2">
                        今日からの予定
                    </button>
                </div>

                <Link
                    href={`/${locale}/calendar`}
                    className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                    月表示へ <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </Link>
            </div>

            {/* Week Grid */}
            <div className="grid grid-cols-7 gap-2">
                {/* Days */}
                {days.map((day) => {
                    const dayTasks = tasks.filter(t => isSameDay(new Date(t.dueAt), day));
                    const isDayToday = isToday(day);
                    const weather = weatherForecast.find(w => isSameDay(new Date(w.date), day));
                    const dayName = format(day, 'E', { locale: ja });

                    return (
                        <div
                            key={day.toISOString()}
                            className={`min-h-[80px] rounded-lg border p-1 flex flex-col gap-0.5 transition-colors ${isDayToday
                                ? 'bg-primary/5 border-2 border-primary'
                                : 'bg-background border-border hover:border-primary/60'
                                }`}
                        >
                            {/* Date Header + Weather */}
                            <div className="text-center mb-0.5 flex flex-col items-center">
                                <div className="text-[9px] font-medium text-muted-foreground">{dayName}</div>

                                <div className="flex items-center gap-1">
                                    <span className={`
                                inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-medium
                                ${isDayToday ? 'bg-primary text-primary-foreground' : 'text-foreground'}
                            `}>
                                        {format(day, 'd')}
                                    </span>
                                </div>

                                {/* Weather Info */}
                                {weather ? (
                                    <div className="flex flex-col items-center text-[9px] text-muted-foreground mt-0.5 leading-none">
                                        <img
                                            src={`https://openweathermap.org/img/wn/${weather.icon}.png`}
                                            alt={weather.condition}
                                            className="w-5 h-5 -my-1"
                                        />
                                        <div className="scale-90 origin-top">
                                            <span className="text-orange-500 font-medium">{Math.round(weather.temperature.max)}°</span>
                                            <span className="text-gray-300 mx-0.5">/</span>
                                            <span className="text-blue-500">{Math.round(weather.temperature.min)}°</span>
                                        </div>
                                    </div>
                                ) : (
                                    // Placeholder if no weather data (past or far future)
                                    <div className="h-6"></div>
                                )}
                            </div>

                            <div className="flex-1 space-y-0.5 overflow-y-auto max-h-[80px] scrollbar-thin mt-0.5">
                                {dayTasks.map(task => (
                                    <Link
                                        key={task.id}
                                        href={`/${locale}/projects/${task.id}`}
                                        className={`block text-[10px] p-1 rounded border border-l-2 truncate transition-colors leading-tight ${task.status === 'completed'
                                            ? 'bg-secondary text-muted-foreground border-l-gray-400 opacity-70 line-through'
                                            : 'bg-white hover:bg-gray-50 text-foreground border-l-primary shadow-sm'
                                            }`}
                                        title={`${task.title} (${task.projectName || 'Project'})`}
                                    >
                                        {task.title}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
