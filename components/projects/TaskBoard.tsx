'use client';

import { useTranslations } from 'next-intl';

interface Task {
    id: string;
    title: string;
    description?: string;
    dueDate: string;
    status: 'pending' | 'completed' | 'scheduled';
    priority: 'high' | 'medium' | 'low';
}

interface TaskBoardProps {
    tasks: Task[];
    onTaskComplete?: (taskId: string) => void;
}

export default function TaskBoard({ tasks, onTaskComplete }: TaskBoardProps) {
    const t = useTranslations('projects.tasks');

    // Filter tasks
    const today = new Date().toISOString().split('T')[0];
    const pendingTasks = tasks.filter(t => t.status !== 'completed').sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    const todaysTasks = pendingTasks.filter(t => t.dueDate <= today);
    const upcomingTasks = pendingTasks.filter(t => t.dueDate > today).slice(0, 3);

    return (
        <div className="space-y-8">
            {/* Today's Focus */}
            <section>
                <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                        <span className="material-symbols-outlined text-orange-600 text-lg">wb_sunny</span>
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">{t('todays_focus')}</h2>
                </div>

                <div className="space-y-3">
                    {todaysTasks.length > 0 ? (
                        todaysTasks.map(task => (
                            <TaskCard key={task.id} task={task} onComplete={onTaskComplete} isToday={true} />
                        ))
                    ) : (
                        <div className="p-6 bg-green-50 rounded-2xl border border-green-100 text-center">
                            <span className="material-symbols-outlined text-green-500 text-3xl mb-2">check_circle</span>
                            <p className="text-green-800 font-medium">All caught up for today!</p>
                            <p className="text-green-600 text-sm">Great job keeping your crop healthy.</p>
                        </div>
                    )}
                </div>
            </section>

            {/* Upcoming */}
            {upcomingTasks.length > 0 && (
                <section>
                    <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                        <span className="material-symbols-outlined text-gray-400">upcoming</span>
                        {t('upcoming')}
                    </h3>
                    <div className="space-y-3 opacity-80">
                        {upcomingTasks.map(task => (
                            <TaskCard key={task.id} task={task} onComplete={onTaskComplete} isToday={false} />
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}

function TaskCard({ task, onComplete, isToday }: { task: Task, onComplete?: (id: string) => void, isToday: boolean }) {
    return (
        <div className={`
            group relative p-4 rounded-xl border transition-all duration-200 hover:shadow-md
            ${isToday ? 'bg-white border-blue-100 shadow-sm' : 'bg-gray-50 border-gray-100'}
        `}>
            <div className="flex items-start gap-4">
                <button
                    onClick={() => onComplete?.(task.id)}
                    className={`
                        mt-1 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors
                        ${isToday ? 'border-blue-500 text-transparent hover:bg-blue-50' : 'border-gray-300 text-transparent hover:border-gray-400'}
                        group-hover:text-blue-200
                    `}
                >
                    <span className="material-symbols-outlined text-sm">check</span>
                </button>

                <div className="flex-1">
                    <div className="flex justify-between items-start">
                        <h4 className={`font-semibold ${isToday ? 'text-gray-900' : 'text-gray-700'}`}>{task.title}</h4>
                        {task.priority === 'high' && (
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full font-medium">
                                High Priority
                            </span>
                        )}
                    </div>
                    {task.description && (
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{task.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs">calendar_today</span>
                            {new Date(task.dueDate).toLocaleDateString()}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
