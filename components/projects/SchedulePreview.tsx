'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

export default function SchedulePreview({
    schedule,
    onEdit,
    onDelete
}: {
    schedule: any;
    onEdit?: (taskIndex: number, field: string, value: any) => void;
    onDelete?: (taskIndex: number) => void;
}) {
    const t = useTranslations('projects.wizard');
    const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set([1]));

    if (!schedule) return null;

    const toggleWeek = (weekNumber: number) => {
        const newExpanded = new Set(expandedWeeks);
        if (newExpanded.has(weekNumber)) {
            newExpanded.delete(weekNumber);
        } else {
            newExpanded.add(weekNumber);
        }
        setExpandedWeeks(newExpanded);
    };

    // Flatten all tasks for indexing
    const allTasks = schedule.weeks?.flatMap((week: any) => week.tasks) || [];

    return (
        <div className="space-y-6">
            {/* Summary */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                        <p className="text-sm text-blue-600">合計タスク</p>
                        <p className="text-2xl font-bold text-blue-900">{schedule.totalTasks || allTasks.length}</p>
                    </div>
                    <div>
                        <p className="text-sm text-blue-600">期間</p>
                        <p className="text-2xl font-bold text-blue-900">{schedule.weeks?.length || 0} 週</p>
                    </div>
                    <div>
                        <p className="text-sm text-blue-600">開始</p>
                        <p className="text-lg font-semibold text-blue-900">
                            {schedule.project?.startDate ? new Date(schedule.project.startDate).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' }) : '-'}
                        </p>
                    </div>
                    <div>
                        <p className="text-sm text-blue-600">収穫</p>
                        <p className="text-lg font-semibold text-blue-900">
                            {schedule.project?.targetHarvestDate ? new Date(schedule.project.targetHarvestDate).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' }) : '-'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Milestones Timeline */}
            {schedule.milestones && schedule.milestones.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                    <h3 className="font-bold text-gray-900 mb-4">主要マイルストーン</h3>
                    <div className="flex items-center gap-2 overflow-x-auto">
                        {schedule.milestones.map((milestone: any, idx: number) => (
                            <div key={idx} className="flex items-center">
                                <div className="flex flex-col items-center min-w-[120px]">
                                    <div className="w-3 h-3 bg-green-600 rounded-full"></div>
                                    <div className="text-xs font-semibold text-gray-900 mt-2 text-center">{milestone.name}</div>
                                    <div className="text-xs text-gray-500 mt-1">
                                        {new Date(milestone.date).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}
                                    </div>
                                </div>
                                {idx < schedule.milestones.length - 1 && (
                                    <div className="h-0.5 w-12 bg-gray-300 mb-8"></div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Weekly Task List */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                    <h3 className="font-bold text-gray-900">週別タスク</h3>
                </div>

                <div className="divide-y divide-gray-200">
                    {schedule.weeks?.map((week: any) => {
                        const isExpanded = expandedWeeks.has(week.weekNumber);
                        return (
                            <div key={week.weekNumber} className="border-b border-gray-100 last:border-0">
                                <button
                                    onClick={() => toggleWeek(week.weekNumber)}
                                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                            <span className="text-sm font-bold text-blue-700">W{week.weekNumber}</span>
                                        </div>
                                        <div className="text-left">
                                            <p className="font-semibold text-gray-900">第{week.weekNumber}週</p>
                                            <p className="text-sm text-gray-500">
                                                {new Date(week.startDate).toLocaleDateString('ja-JP')} - {week.tasks?.length || 0} タスク
                                            </p>
                                        </div>
                                    </div>
                                    <span className="material-symbols-outlined text-gray-400">
                                        {isExpanded ? 'expand_less' : 'expand_more'}
                                    </span>
                                </button>

                                {isExpanded && (
                                    <div className="px-6 pb-4 space-y-3">
                                        {week.tasks?.map((task: any, taskIdx: number) => {
                                            const globalTaskIndex = allTasks.findIndex((t: any) => t === task);
                                            return (
                                                <div
                                                    key={taskIdx}
                                                    className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-gray-300 transition"
                                                >
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <h4 className="font-semibold text-gray-900">{task.title}</h4>
                                                                <span className={`px-2 py-0.5 text-xs rounded-full ${task.priority === 'high' ? 'bg-red-100 text-red-700' :
                                                                    task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                                                        'bg-gray-100 text-gray-700'
                                                                    }`}>
                                                                    {task.priority}
                                                                </span>
                                                                {task.weatherDependent && (
                                                                    <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full flex items-center gap-1">
                                                                        <span className="material-symbols-outlined text-xs">partly_cloudy_day</span>
                                                                        天候依存
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                                                            <div className="flex items-center gap-4 text-xs text-gray-500">
                                                                <span>📅 {new Date(task.dueDate).toLocaleDateString('ja-JP')}</span>
                                                                {task.estimatedHours && <span>⏱️ {task.estimatedHours}時間</span>}
                                                            </div>
                                                            {task.weatherCondition && (
                                                                <p className="text-xs text-blue-600 mt-2">💡 {task.weatherCondition}</p>
                                                            )}
                                                        </div>
                                                        {(onEdit || onDelete) && (
                                                            <div className="flex gap-2">
                                                                {onEdit && (
                                                                    <button
                                                                        className="text-gray-400 hover:text-blue-600 transition"
                                                                        onClick={() => onEdit(globalTaskIndex, 'title', task.title)}
                                                                    >
                                                                        <span className="material-symbols-outlined text-sm">edit</span>
                                                                    </button>
                                                                )}
                                                                {onDelete && (
                                                                    <button
                                                                        className="text-gray-400 hover:text-red-600 transition"
                                                                        onClick={() => onDelete(globalTaskIndex)}
                                                                    >
                                                                        <span className="material-symbols-outlined text-sm">delete</span>
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
