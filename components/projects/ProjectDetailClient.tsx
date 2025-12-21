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
};

interface ProjectDetailClientProps {
    project: Project;
    locale: string;
}

export default function ProjectDetailClient({ project, locale }: ProjectDetailClientProps) {
    const t = useTranslations('projects');
    const router = useRouter();
    const [showTaskCreateModal, setShowTaskCreateModal] = useState(false);
    const [selectedDateForTask, setSelectedDateForTask] = useState<Date | undefined>(undefined);
    const [taskInitialData, setTaskInitialData] = useState<{ title: string; description?: string } | undefined>(undefined);
    const chatRef = useRef<RouvisChatKitRef>(null);

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

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
        try {
            const res = await fetch(`/api/v1/tasks/${taskId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status }),
            });

            if (!res.ok) throw new Error('Failed to update task');

            router.refresh();
        } catch (error) {
            console.error('Failed to update task', error);
            alert(t('update_failed'));
        }
    };

    const handleTaskCreate = (date: Date, initialData?: { title: string; description?: string }) => {
        setSelectedDateForTask(date);
        setTaskInitialData(initialData);
        setShowTaskCreateModal(true);
    };

    return (
        <div className="min-h-[calc(100vh-64px)] bg-gray-50/50 flex flex-col">
            <div className="container mx-auto px-4 py-2 max-w-7xl flex-1 flex flex-col">
                {/* Top Bar: Back Link + Compact ProjectHeader */}
                <div className="flex-none mb-3 flex items-start gap-4">
                    <Link href={`/${locale}/projects`} className="flex-none inline-flex items-center gap-1 text-gray-500 hover:text-gray-900 transition font-medium text-sm mt-2">
                        <span className="material-symbols-outlined text-lg">arrow_back</span>
                        <span className="hidden sm:inline">{t('back_to_projects')}</span>
                    </Link>

                    {/* Compact Status Bar (Grow) */}
                    <div className="flex-1">
                        <ProjectHeader project={project} compact={true} />
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch mb-2 lg:h-[calc(100vh-120px)] h-auto">
                    {/* LEFT COLUMN: Companion Sidebar */}
                    <div id="project-chat-kit" className="lg:col-span-4 order-2 lg:order-1 flex flex-col h-full min-h-0">
                        <RouvisChatKit
                            ref={chatRef}
                            className="flex-1 border border-gray-200 rounded-2xl shadow-sm overflow-hidden bg-white h-full"
                            projectId={project.id}
                            onTaskUpdate={() => router.refresh()}
                            onDraftCreate={(draft) => handleTaskCreate(new Date(), draft)}
                            density="compact"
                            growthStage={project.currentStage}
                        />
                    </div>

                    {/* RIGHT COLUMN: Calendar Only (Auto Height) */}
                    <div className="lg:col-span-8 order-1 lg:order-2 flex flex-col gap-2 h-full min-h-0">
                        {/* 2. Onboarding OR Calendar */}
                        {(!project.tasks || project.tasks.length === 0) ? (
                            <ProjectAgentOnboarding
                                projectId={project.id}
                                crop={project.crop}
                                startDate={project.startDate}
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
