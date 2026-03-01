'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import {
    format,
    addDays,
    subDays,
    isSameDay,
    isToday,
    Locale as DateFnsLocale
} from 'date-fns';
import { enUS, ja } from 'date-fns/locale';

interface Task {
    id: string;
    title: string;
    dueAt: string; // ISO string
    projectId?: string;
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
    const t = useTranslations('calendar');
    const [currentDate, setCurrentDate] = useState(new Date());
    const dateLocale: DateFnsLocale = locale === 'ja' ? ja : enUS;

    const handlePrev = () => setCurrentDate(prev => subDays(prev, 7));
    const handleNext = () => setCurrentDate(prev => addDays(prev, 7));
    const handleToday = () => setCurrentDate(new Date());

    // Generate 7 days starting from CURRENT DATE (Leftmost = Today/Start Date)
    const days = Array.from({ length: 7 }, (_, i) => addDays(currentDate, i));

    return (
        <div data-testid="dashboard-mini-calendar" className="h-full rounded-2xl border border-border bg-card p-3 sm:p-4">
            {/* Header */}
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                    <h2 className="flex items-center gap-2 text-base font-semibold text-foreground sm:text-lg">
                        <span className="material-symbols-outlined text-primary">calendar_month</span>
                        {format(currentDate, locale === 'ja' ? 'yyyy年 M月' : 'MMMM yyyy', { locale: dateLocale })}
                    </h2>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                        <div className="flex rounded-lg bg-secondary p-0.5">
                            <button onClick={handlePrev} className="rounded-md p-1 transition-colors text-muted-foreground hover:bg-background hover:text-foreground">
                            <span className="material-symbols-outlined text-lg">chevron_left</span>
                            </button>
                            <button onClick={handleNext} className="rounded-md p-1 transition-colors text-muted-foreground hover:bg-background hover:text-foreground">
                                <span className="material-symbols-outlined text-lg">chevron_right</span>
                            </button>
                        </div>
                        <button onClick={handleToday} className="rounded-full border border-border bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground transition-colors hover:bg-secondary/75 sm:text-sm">
                            {t('today')}
                        </button>
                    </div>
                </div>

                <Link
                    href={`/${locale}/calendar`}
                    className="inline-flex min-h-[40px] items-center gap-1 self-start rounded-lg border border-border bg-secondary px-3 py-2 text-sm font-semibold text-foreground transition hover:bg-secondary/75"
                >
                    {t('view_full_calendar')} <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </Link>
            </div>

            {/* Week Grid */}
            <div data-testid="dashboard-mini-calendar-scroll" className="-mx-3 overflow-x-auto px-3 pb-1 sm:mx-0 sm:px-0">
                <div className="grid min-w-[42rem] grid-flow-col auto-cols-[minmax(5.5rem,1fr)] gap-2 sm:min-w-0 sm:grid-cols-7 sm:grid-flow-row sm:auto-cols-auto">
                {/* Days */}
                {days.map((day) => {
                    const dayTasks = tasks.filter(t => isSameDay(new Date(t.dueAt), day));
                    const isDayToday = isToday(day);
                    const weather = weatherForecast.find(w => isSameDay(new Date(w.date), day));
                    const dayName = format(day, locale === 'ja' ? 'E' : 'EEE', { locale: dateLocale });

                    return (
                        <div
                            key={day.toISOString()}
                            className={`flex min-h-[8.5rem] flex-col gap-1 rounded-xl border p-2 transition-colors ${isDayToday
                                ? 'border-primary bg-primary/5'
                                : 'bg-background border-border hover:border-primary/60'
                                }`}
                        >
                            {/* Date Header + Weather */}
                            <div className="mb-0.5 flex flex-col items-center text-center">
                                <div className="text-[10px] font-medium text-muted-foreground">{dayName}</div>

                                <div className="flex items-center gap-1">
                                    <span className={`
                                inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-medium
                                ${isDayToday ? 'bg-primary text-primary-foreground' : 'text-foreground'}
                            `}>
                                        {format(day, 'd')}
                                    </span>
                                </div>

                                {/* Weather Info */}
                                {weather ? (
                                    <div className="mt-0.5 flex flex-col items-center text-[10px] leading-none text-muted-foreground">
                                        <img
                                            src={`https://openweathermap.org/img/wn/${weather.icon}.png`}
                                            alt={weather.condition}
                                            className="h-5 w-5 -my-1"
                                        />
                                        <div className="origin-top scale-90">
                                            <span className="text-orange-500 font-medium">{Math.round(weather.temperature.max)}°</span>
                                            <span className="text-gray-300 mx-0.5">/</span>
                                            <span className="text-blue-500">{Math.round(weather.temperature.min)}°</span>
                                        </div>
                                    </div>
                                ) : (
                                    // Placeholder if no weather data (past or far future)
                                    <div className="h-6" />
                                )}
                            </div>

                            <div className="mt-0.5 flex-1 space-y-1 overflow-y-auto pr-0.5 scrollbar-thin">
                                {dayTasks.map(task => (
                                    task.projectId ? (
                                        <Link
                                            key={task.id}
                                            href={`/${locale}/projects/${task.projectId}`}
                                            className={`block truncate rounded-lg border border-l-2 p-1.5 text-[11px] leading-tight transition-colors ${task.status === 'completed'
                                                ? 'border-l-gray-400 bg-secondary text-muted-foreground opacity-70 line-through'
                                                : 'border-l-primary bg-white text-foreground shadow-sm hover:bg-gray-50'
                                                }`}
                                            title={`${task.title} (${task.projectName || 'Project'})`}
                                        >
                                            {task.title}
                                        </Link>
                                    ) : (
                                        <div
                                            key={task.id}
                                            className={`truncate rounded-lg border border-l-2 p-1.5 text-[11px] leading-tight ${task.status === 'completed'
                                                ? 'border-l-gray-400 bg-secondary text-muted-foreground opacity-70 line-through'
                                                : 'border-l-primary bg-white text-foreground shadow-sm'
                                                }`}
                                            title={task.title}
                                        >
                                            {task.title}
                                        </div>
                                    )
                                ))}
                                {dayTasks.length === 0 ? (
                                    <p className="pt-1 text-center text-[11px] text-muted-foreground">{t('no_work_scheduled')}</p>
                                ) : null}
                            </div>
                        </div>
                    );
                })}
                </div>
            </div>
        </div>
    );
}
