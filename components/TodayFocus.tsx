'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

interface Task {
    id: string;
    title: string;
    dueDate: string;
    status: string;
    priority: string;
    projectId?: string;
    project?: {
        name: string;
    };
}

interface TodayFocusProps {
    tasks: Task[];
    locale: string;
}

export default function TodayFocus({ tasks: initialTasks, locale }: TodayFocusProps) {
    const t = useTranslations('dashboard'); // Assuming dashboard namespace has relevant keys or we'll add them
    const router = useRouter();
    const [tasks, setTasks] = useState<Task[]>(initialTasks);
    const [completingId, setCompletingId] = useState<string | null>(null);

    const handleComplete = async (taskId: string) => {
        setCompletingId(taskId);
        try {
            const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
            // 1. Update Task Status
            const res = await fetch(`${baseUrl}/api/v1/tasks/${taskId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'completed' }),
            });

            if (!res.ok) throw new Error('Failed to complete task');

            // 2. Optimistic Update
            setTasks(prev => prev.filter(t => t.id !== taskId));

            // 3. Refresh Server Data
            router.refresh();

            // TODO: In the future, prompt to log an activity here
        } catch (error) {
            console.error('Failed to complete task:', error);
            alert('Failed to update task');
            setCompletingId(null);
        }
    };

    if (tasks.length === 0) {
        return (
            <div className="mb-8 bg-card rounded-xl border border-border p-6">
                <h2 className="text-lg font-semibold text-foreground">
                    今日の作業
                </h2>
                <p className="text-muted-foreground text-sm mt-1">
                    今日の予定はありません。ゆっくりできますね 🌾
                </p>
            </div>
        );
    }

    return (
        <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground">
                    今日の作業
                </h2>
                <span className="text-sm text-muted-foreground">
                    あと {tasks.length} 件
                </span>
            </div>

            <div className="grid gap-3">
                {tasks.map(task => {
                    const isOverdue = new Date(task.dueDate) < new Date(new Date().setHours(0, 0, 0, 0));

                    return (
                        <div
                            key={task.id}
                            className={`group bg-card rounded-xl border p-4 flex items-center gap-4 transition-colors ${
                                isOverdue ? 'border-warning/30 bg-warning/5' : 'border-border hover:border-primary/30'
                            }`}
                        >
                            {/* Checkbox */}
                            <button
                                onClick={() => handleComplete(task.id)}
                                disabled={completingId === task.id}
                                className={`flex-shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-colors min-w-[44px] min-h-[44px] ${
                                    completingId === task.id
                                        ? 'bg-primary/10 border-primary/30'
                                        : 'border-border hover:border-primary hover:bg-primary/5'
                                }`}
                                aria-label="完了にする"
                            >
                                {completingId === task.id ? (
                                    <span className="text-primary text-sm">...</span>
                                ) : (
                                    <span className="text-transparent group-hover:text-primary text-lg">✓</span>
                                )}
                            </button>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <h3 className={`text-base font-medium truncate ${isOverdue ? 'text-warning' : 'text-foreground'}`}>
                                    {task.title}
                                </h3>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                    {task.project && (
                                        <>
                                            <span>{task.project.name}</span>
                                            <span>·</span>
                                        </>
                                    )}
                                    <span className={isOverdue ? 'text-warning font-medium' : ''}>
                                        {isOverdue ? '期限切れ' : new Date(task.dueDate).toLocaleDateString(locale)}
                                    </span>
                                </div>
                            </div>

                            {/* Link */}
                            {task.projectId && (
                                <Link
                                    href={`/${locale}/projects/${task.projectId}`}
                                    className="flex-shrink-0 text-muted-foreground hover:text-primary p-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
                                >
                                    →
                                </Link>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
