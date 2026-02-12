'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { RouvisChatKit, RouvisChatKitRef } from '@/components/RouvisChatKit';
import ProjectHeader from '@/components/projects/ProjectHeader';
import ProjectCalendar from '@/components/projects/ProjectCalendar';
import ProjectAgentOnboarding from '@/components/projects/ProjectAgentOnboarding';
import TaskCreateModal from './TaskCreateModal';

type ProjectTask = {
    id: string;
    title: string;
    dueDate: string;
    status: string;
};

type ProjectSchedulingPreferences = {
    preferredWorkStartHour?: number;
    preferredWorkEndHour?: number;
    maxTasksPerDay?: number;
    avoidWeekdays?: number[];
    riskTolerance?: 'conservative' | 'balanced' | 'aggressive';
    irrigationStyle?: 'manual' | 'reminder' | 'strict';
    constraintsNote?: string;
} | null;

type Project = {
    id: string;
    name: string;
    crop: string;
    variety?: string;
    startDate: string;
    targetHarvestDate?: string;
    status: string;
    notes?: string;
    tasks?: ProjectTask[];
    currentStage?: string;
    schedulingPreferences?: ProjectSchedulingPreferences;
};

interface ProjectDetailClientProps {
    project: Project;
    locale: string;
}

type NoticeState = {
    type: 'success' | 'error';
    message: string;
} | null;

export default function ProjectDetailClient({ project, locale }: ProjectDetailClientProps) {
    const t = useTranslations('projects');
    const router = useRouter();
    const [showTaskCreateModal, setShowTaskCreateModal] = useState(false);
    const [selectedDateForTask, setSelectedDateForTask] = useState<Date | undefined>(undefined);
    const [taskInitialData, setTaskInitialData] = useState<{ title: string; description?: string } | undefined>(undefined);
    const [notice, setNotice] = useState<NoticeState>(null);
    const chatRef = useRef<RouvisChatKitRef>(null);

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    useEffect(() => {
        if (!notice) return;
        const timeout = setTimeout(() => setNotice(null), 4000);
        return () => clearTimeout(timeout);
    }, [notice]);

    const handleRescheduleRequest = (message?: string) => {
        if (chatRef.current) {
            // Activate Reschedule Mode with visual banner
            chatRef.current.setChatMode('reschedule');

            // Set specific suggestions for rescheduling context
            chatRef.current.setSuggestions([
                { label: 'スケジュールと天気を再確認', message: '今後のスケジュールと直近の天気を再確認し、必要な変更があれば提案して。' },
                { label: '作業の優先順位を見直す', message: '作業の優先順位を見直したいです。どれから手をつけるべき？' },
                { label: 'キャンセル', message: '', isCancel: true }
            ]);

            if (message) {
                chatRef.current.sendMessage(message, 'reschedule');
            }
        }
    };

    const handleTaskComplete = async (taskId: string, status: string) => {
        setNotice(null);
        try {
            const res = await fetch(`/api/v1/tasks/${taskId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status }),
            });

            if (!res.ok) throw new Error('Failed to update task');

            router.refresh();
            setNotice({
                type: 'success',
                message: status === 'completed' ? 'タスクを完了にしました。' : 'タスクを更新しました。',
            });
        } catch (error) {
            console.error('Failed to update task', error);
            setNotice({
                type: 'error',
                message: t('update_failed'),
            });
        }
    };

    const handleTaskCreate = (date: Date, initialData?: { title: string; description?: string }) => {
        setSelectedDateForTask(date);
        setTaskInitialData(initialData);
        setShowTaskCreateModal(true);
    };

  return (
        <div className="min-h-[calc(100vh-64px)] shell-canvas flex flex-col">
            <div className="shell-main py-3 flex-1 flex flex-col">
                {/* Top Bar: Back Link + Compact ProjectHeader */}
                <div className="mb-3 flex flex-none items-start gap-3">
                    <Link
                        href={`/${locale}/projects`}
                        className="mt-1 inline-flex flex-none items-center gap-1 rounded-md px-2 py-1 text-sm font-semibold text-muted-foreground transition hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                        <span className="material-symbols-outlined text-lg">arrow_back</span>
                        <span className="hidden sm:inline">{t('back_to_projects')}</span>
                    </Link>

                    {/* Compact Status Bar (Grow) */}
                    <div className="flex-1">
                        <ProjectHeader project={project} compact={true} />
                    </div>
                </div>

                {notice && (
                    <div
                        className={`mb-3 rounded-lg border px-4 py-3 text-sm ${
                            notice.type === 'success'
                                ? 'status-safe'
                                : 'status-critical'
                        }`}
                    >
                        {notice.message}
                    </div>
                )}

                <div className="mb-2 grid h-auto grid-cols-1 items-stretch gap-4 lg:h-[calc(100vh-120px)] lg:grid-cols-12">
                    {/* LEFT COLUMN: Companion Sidebar */}
                    <div id="project-chat-kit" className="order-2 flex h-full min-h-0 flex-col lg:order-1 lg:col-span-4">
                        <RouvisChatKit
                            ref={chatRef}
                            className="surface-base h-full flex-1 overflow-hidden"
                            projectId={project.id}
                            onTaskUpdate={() => router.refresh()}
                            onDraftCreate={(draft) => handleTaskCreate(new Date(), draft)}
                            density="compact"
                            growthStage={project.currentStage}
                        />
                    </div>

                    {/* RIGHT COLUMN: Calendar Only (Auto Height) */}
                    <div className="order-1 flex h-full min-h-0 flex-col gap-2 lg:order-2 lg:col-span-8">
                        {/* 2. Onboarding OR Calendar */}
                        {(!project.tasks || project.tasks.length === 0) ? (
                            <ProjectAgentOnboarding
                                projectId={project.id}
                                crop={project.crop}
                                startDate={project.startDate}
                                initialPreferences={project.schedulingPreferences || null}
                            />
                        ) : (
                            <div className="flex flex-col h-full min-h-0">
                                <ProjectCalendar
                                    startDate={project.startDate}
                                    targetHarvestDate={project.targetHarvestDate}
                                    tasks={project.tasks}
                                    project={project}
                                    onRescheduleRequest={handleRescheduleRequest}
                                    onTaskComplete={handleTaskComplete}
                                    onTaskCreate={handleTaskCreate}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <TaskCreateModal
                projectId={project.id}
                isOpen={showTaskCreateModal}
                onClose={() => setShowTaskCreateModal(false)}
                initialDate={selectedDateForTask}
                initialData={taskInitialData}
            />
        </div>
    );
}
