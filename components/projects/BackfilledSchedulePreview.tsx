'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

type Task = {
    title: string;
    description: string;
    dueDate: string;
    priority?: string;
    status: string;
    isBackfilled?: boolean;
};

type Schedule = {
    daysSincePlanting: number;
    currentWeek: number;
    pastTasks: { weekNumber: number; startDate: string; tasks: Task[] }[];
    currentWeekTasks: Task[];
    futureTasks: { weekNumber: number; startDate: string; tasks: Task[] }[];
    milestones: { name: string; date: string; status: string }[];
};

export default function BackfilledSchedulePreview({
    schedule,
    onRemovePastTask
}: {
    schedule: Schedule;
    onRemovePastTask?: (weekIndex: number, taskIndex: number) => void;
}) {
    const t = useTranslations('projects.timeline');
    const [expandedWeeks, setExpandedWeeks] = useState<Record<string, boolean>>({});

    const toggleWeek = (id: string) => {
        setExpandedWeeks(prev => ({ ...prev, [id]: !prev[id] }));
    };

    return (
        <div className="space-y-8">
            {/* Timeline Visualization */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 overflow-x-auto">
                <h3 className="text-lg font-bold text-gray-900 mb-4">{t('visualization')}</h3>
                <div className="relative min-w-[600px] pt-8 pb-4">
                    <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-200 -translate-y-1/2"></div>

                    <div className="flex justify-between relative z-10">
                        {/* Start */}
                        <div className="flex flex-col items-center">
                            <div className="w-4 h-4 bg-gray-400 rounded-full mb-2"></div>
                            <span className="text-xs text-gray-500">Start</span>
                        </div>

                        {/* Past Milestones */}
                        {schedule.milestones.filter(m => m.status === 'past').map((m, i) => (
                            <div key={`past-${i}`} className="flex flex-col items-center">
                                <div className="w-3 h-3 bg-gray-400 rounded-full mb-2"></div>
                                <span className="text-xs text-gray-500">{m.name}</span>
                            </div>
                        ))}

                        {/* Current Position */}
                        <div className="flex flex-col items-center -mt-4">
                            <div className="bg-green-600 text-white text-xs px-2 py-1 rounded-full mb-1 animate-bounce">
                                {t('youAreHere')}
                            </div>
                            <div className="w-6 h-6 bg-green-600 border-4 border-white rounded-full shadow-md"></div>
                            <span className="text-xs font-bold text-green-700 mt-2">Week {schedule.currentWeek}</span>
                        </div>

                        {/* Future Milestones */}
                        {schedule.milestones.filter(m => m.status === 'future').map((m, i) => (
                            <div key={`future-${i}`} className="flex flex-col items-center">
                                <div className="w-3 h-3 bg-blue-200 rounded-full mb-2"></div>
                                <span className="text-xs text-gray-500">{m.name}</span>
                            </div>
                        ))}

                        {/* Harvest */}
                        <div className="flex flex-col items-center">
                            <div className="w-4 h-4 bg-blue-500 rounded-full mb-2"></div>
                            <span className="text-xs text-gray-500">Harvest</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Current Week (Priority) */}
            <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                    <span className="material-symbols-outlined text-green-600 text-3xl">bolt</span>
                    <div>
                        <h3 className="text-xl font-bold text-gray-900">{t('currentWeek')}</h3>
                        <p className="text-sm text-green-700">Week {schedule.currentWeek} - Priority Tasks</p>
                    </div>
                </div>

                <div className="space-y-3">
                    {schedule.currentWeekTasks.map((task, i) => (
                        <div key={i} className="bg-white p-4 rounded-lg shadow-sm border border-green-100 flex items-start gap-3">
                            <div className={`mt-1 w-3 h-3 rounded-full ${task.priority === 'high' ? 'bg-red-500' : 'bg-green-500'}`}></div>
                            <div>
                                <h4 className="font-bold text-gray-900">{task.title}</h4>
                                <p className="text-sm text-gray-600">{task.description}</p>
                                <div className="flex gap-2 mt-2">
                                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                        {task.dueDate}
                                    </span>
                                    {task.priority === 'high' && (
                                        <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded font-medium">
                                            High Priority
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Past Tasks (Collapsible) */}
            <div className="border border-gray-200 rounded-xl overflow-hidden">
                <button
                    onClick={() => toggleWeek('past')}
                    className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition"
                >
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-gray-400">history</span>
                        <span className="font-medium text-gray-700">{t('past')}</span>
                        <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                            {schedule.pastTasks.reduce((acc, w) => acc + w.tasks.length, 0)} tasks
                        </span>
                    </div>
                    <span className="material-symbols-outlined text-gray-400">
                        {expandedWeeks['past'] ? 'expand_less' : 'expand_more'}
                    </span>
                </button>

                {expandedWeeks['past'] && (
                    <div className="p-4 bg-gray-50 space-y-6 border-t border-gray-200">
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800 flex gap-2">
                            <span className="material-symbols-outlined text-yellow-600">info</span>
                            {t('pastWarning')}
                        </div>

                        {schedule.pastTasks.map((week, wIndex) => (
                            <div key={wIndex} className="ml-4 border-l-2 border-gray-300 pl-4 relative">
                                <div className="absolute -left-[9px] top-0 w-4 h-4 bg-gray-300 rounded-full border-2 border-gray-50"></div>
                                <h5 className="font-bold text-gray-500 mb-2">Week {week.weekNumber}</h5>
                                <div className="space-y-2">
                                    {week.tasks.map((task, tIndex) => (
                                        <div key={tIndex} className="bg-white p-3 rounded border border-gray-200 opacity-75 hover:opacity-100 transition flex justify-between group">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-green-600 text-sm">check_circle</span>
                                                    <span className="font-medium text-gray-700 line-through">{task.title}</span>
                                                </div>
                                                <p className="text-xs text-gray-500 ml-6">{task.description}</p>
                                            </div>
                                            <button
                                                onClick={() => onRemovePastTask?.(wIndex, tIndex)}
                                                className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"
                                                title={t('removeTask')}
                                            >
                                                <span className="material-symbols-outlined">delete</span>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Future Tasks */}
            <div className="space-y-4">
                <h3 className="text-lg font-bold text-gray-900">{t('future')}</h3>
                {schedule.futureTasks.map((week, i) => (
                    <div key={i} className="border border-gray-200 rounded-lg p-4">
                        <h4 className="font-bold text-gray-800 mb-2">Week {week.weekNumber} - {week.startDate}</h4>
                        <div className="space-y-2">
                            {week.tasks.map((task, j) => (
                                <div key={j} className="flex items-center gap-3 text-sm">
                                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                                    <span className="font-medium text-gray-700">{task.title}</span>
                                    <span className="text-gray-500">- {task.description}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
