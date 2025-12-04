'use client';

import { useTranslations } from 'next-intl';
import { format, isSameDay, isToday } from 'date-fns';
import { ja } from 'date-fns/locale';

interface Task {
    id: string;
    title: string;
    dueDate: string;
    status: string;
    priority?: string;
}

interface TaskSidePanelProps {
    selectedDate: Date;
    tasks: Task[];
    onAddTask?: (date: Date) => void;
    onTaskComplete?: (taskId: string, status: string) => void;
}

export default function TaskSidePanel({ selectedDate, tasks, onAddTask, onTaskComplete }: TaskSidePanelProps) {
    const t = useTranslations('projects.calendar');
    const tProject = useTranslations('projects');

    const selectedTasks = tasks.filter(task => isSameDay(new Date(task.dueDate), selectedDate));
    const isTodaySelected = isToday(selectedDate);

    // Mock Weather Data (In a real app, fetch based on date)
    const weather = {
        temp: 24,
        condition: 'sunny', // sunny, cloudy, rain
        icon: 'sunny'
    };

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm h-full flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-gray-100 bg-gray-50/50 rounded-t-xl">
                <div className="flex justify-between items-start mb-2">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">
                            {format(selectedDate, 'M月d日 (EEE)', { locale: ja })}
                        </h3>
                        <p className="text-xs text-gray-500">
                            {isTodaySelected ? t('todays_focus') : t('tasks_for_date')}
                        </p>
                    </div>
                    {/* Weather Widget (Mock) */}
                    <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-lg border border-gray-100 shadow-sm">
                        <span className="material-symbols-outlined text-orange-500">sunny</span>
                        <span className="text-sm font-bold text-gray-700">24°C</span>
                    </div>
                </div>
            </div>

            {/* Task List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {selectedTasks.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                        <span className="material-symbols-outlined text-4xl mb-2 opacity-20">event_available</span>
                        <p className="text-sm">{t('no_tasks_for_date')}</p>
                    </div>
                ) : (
                    selectedTasks.map(task => (
                        <div key={task.id} className={`p-3 rounded-lg border transition-all hover:shadow-sm ${task.status === 'completed'
                            ? 'bg-gray-50 border-gray-200 opacity-70'
                            : 'bg-white border-gray-200 hover:border-green-300'
                            }`}>
                            <div className="flex items-start gap-3">
                                <button
                                    onClick={() => onTaskComplete?.(task.id, task.status === 'completed' ? 'pending' : 'completed')}
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
                    onClick={() => onAddTask ? onAddTask(selectedDate) : alert(tProject('add_task_alert'))}
                >
                    <span className="material-symbols-outlined text-lg">add</span>
                    {t('add_memo')}
                </button>
            </div>
        </div>
    );
}
