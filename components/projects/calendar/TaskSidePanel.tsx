'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { format, isSameDay } from 'date-fns';
import { ja } from 'date-fns/locale';

import TaskDetailModal from '../TaskDetailModal';
import { toastInfo } from '@/lib/feedback';

interface Task {
    id: string;
    title: string;
    description?: string;
    dueDate: string;
    status: string;
    priority?: string;
}

interface TaskSidePanelProps {
    selectedDate: Date;
    tasks: Task[];
    affectedTasks?: Array<{ id: string; title: string; dueDate: string }>;
    onAddTask?: (date: Date, initialData?: { title: string; description?: string }) => void;
    onTaskComplete?: (taskId: string, status: string) => void;
}

type ForecastDay = {
    date: string;
    temperature: { min: number; max: number };
    condition: string;
    icon?: string;
};

export default function TaskSidePanel({ selectedDate, tasks, affectedTasks = [], onAddTask, onTaskComplete }: TaskSidePanelProps) {
    const t = useTranslations('projects.calendar');
    const tProject = useTranslations('projects');

    const selectedTasks = tasks.filter(task => isSameDay(new Date(task.dueDate), selectedDate));
    // const isTodaySelected = isToday(selectedDate);

    const [forecast, setForecast] = useState<ForecastDay[]>([]);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);

    useEffect(() => {
        const loadWeather = async () => {
            try {
                const res = await fetch('/api/weather', { cache: 'no-store' });
                if (!res.ok) return;
                const data = await res.json().catch(() => ({}));
                if (Array.isArray(data?.forecast)) setForecast(data.forecast as ForecastDay[]);
            } catch {
                // ignore
            }
        };
        loadWeather();
    }, []);

    const forecastForSelectedDate = useMemo(() => {
        const key = format(selectedDate, 'yyyy-MM-dd');
        return forecast.find(d => d.date === key);
    }, [forecast, selectedDate]);

    const getWeatherIcon = (code?: string) => {
        if (!code) return 'cloud';
        if (code.startsWith('01') || code.startsWith('02')) return 'sunny';
        if (code.startsWith('03') || code.startsWith('04')) return 'cloud';
        if (code.startsWith('09') || code.startsWith('10')) return 'rainy';
        if (code.startsWith('11')) return 'thunderstorm';
        if (code.startsWith('13')) return 'weather_snowy';
        if (code.startsWith('50')) return 'foggy';
        return 'cloud';
    };

    return (
        <>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm h-full flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-gray-100 bg-gray-50/50 rounded-t-xl">
                    <div className="flex justify-between items-start mb-2">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">
                                {format(selectedDate, 'M月d日 (EEE)', { locale: ja })}の作業
                            </h3>
                        </div>
                        {forecastForSelectedDate && (
                            <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-lg border border-gray-100 shadow-sm">
                                <span className="material-symbols-outlined text-sky-600">
                                    {getWeatherIcon(forecastForSelectedDate.icon)}
                                </span>
                                <span className="text-sm font-bold text-gray-700">
                                    {Math.round(forecastForSelectedDate.temperature.max)}°C
                                </span>
                            </div>
                        )}
                    </div>
                    {forecastForSelectedDate?.condition && (
                        <p className="text-xs text-gray-600">
                            天気: {forecastForSelectedDate.condition}
                        </p>
                    )}
                </div>

                {/* Task List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {affectedTasks.length > 0 && (
                        <div className="rounded-lg border border-blue-100 bg-blue-50/70 p-3 text-xs text-blue-900">
                            <p className="mb-1 font-semibold">{t('affected_tasks_title')}</p>
                            <ul className="space-y-1">
                                {affectedTasks.slice(0, 3).map((task) => (
                                    <li key={task.id} className="truncate">• {task.title}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {selectedTasks.length === 0 ? (
                        <div className="text-center py-8 text-gray-400">
                            <span className="material-symbols-outlined text-4xl mb-2 opacity-20">event_available</span>
                            <p className="text-sm">{t('no_tasks_for_date')}</p>
                        </div>
                    ) : (
                        selectedTasks.map(task => (
                            <div
                                key={task.id}
                                onClick={() => setSelectedTask(task)}
                                className={`p-3 rounded-lg border transition-all hover:shadow-sm cursor-pointer ${task.status === 'completed'
                                    ? 'bg-gray-50 border-gray-200 opacity-70'
                                    : 'bg-white border-gray-200 hover:border-green-300'
                                    }`}
                            >
                                <div className="flex items-start gap-3">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onTaskComplete?.(task.id, task.status === 'completed' ? 'pending' : 'completed');
                                        }}
                                        className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center cursor-pointer transition-colors ${task.status === 'completed' ? 'bg-green-500 border-green-500' : 'border-gray-300 hover:border-green-400'
                                            }`}
                                    >
                                        {task.status === 'completed' && <span className="material-symbols-outlined text-white text-[12px] font-bold">check</span>}
                                    </button>
                                    <div className="flex-1">
                                        <p className={`text-sm font-medium ${task.status === 'completed' ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                                            {task.title}
                                        </p>
                                        {task.priority && (
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded mt-1 inline-block ${task.priority === 'high' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                                                }`}>
                                                {task.priority}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}

                    {/* Add Memo / Task Placeholder */}
                    <button
                        className="w-full py-2 border-2 border-dashed border-gray-200 rounded-lg text-gray-400 text-sm font-medium hover:border-green-400 hover:text-green-600 hover:bg-green-50 transition flex items-center justify-center gap-2"
                        onClick={() => onAddTask ? onAddTask(selectedDate) : toastInfo(tProject('add_task_alert'))}
                    >
                        <span className="material-symbols-outlined text-lg">add</span>
                        {t('add_memo')}
                    </button>
                </div>
            </div>

            <TaskDetailModal
                isOpen={!!selectedTask}
                onClose={() => setSelectedTask(null)}
                task={selectedTask || undefined}
            />
        </>
    );
}
