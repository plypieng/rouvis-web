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
    const chatRef = useRef<RouvisChatKitRef>(null);

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    /*
    const handleAiReschedule = () => {
        if (chatRef.current) {
            chatRef.current.sendMessage('向こう1週間のスケジュールと天気予報を確認して、変更が必要な点があれば提案してください。');
        } else {
            alert(t('ai_reschedule_alert'));
        }
    };
    */

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

    const handleTaskCreate = (date: Date) => {
        setSelectedDateForTask(date);
        setShowTaskCreateModal(true);
    };

    return (
        <div className="min-h-[calc(100vh-64px)] bg-gray-50/50 flex flex-col">
            <div className="container mx-auto px-4 py-2 max-w-7xl flex-1 flex flex-col">
                {/* Back Link */}
                <div className="flex-none mb-1">
                    <Link href={`/${locale}/projects`} className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-900 transition font-medium text-sm">
                        <span className="material-symbols-outlined text-lg">arrow_back</span>
                        {t('back_to_projects')}
                    </Link>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch mb-2 h-[calc(100vh-120px)]">
                    {/* LEFT COLUMN: Companion Sidebar */}
                    <div id="project-chat-kit" className="lg:col-span-4 order-2 lg:order-1 flex flex-col h-full min-h-0">
                        <RouvisChatKit
                            ref={chatRef}
                            className="flex-1 border border-gray-200 rounded-2xl shadow-sm overflow-hidden bg-white h-full"
                            projectId={project.id}
                            onTaskUpdate={() => router.refresh()}
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
                                    onAskAI={() => {
                                        if (chatRef.current) {
                                            chatRef.current.sendMessage('このプロジェクトへのアドバイスをお願いします。');
                                        }
                                    }}
                                    onTaskComplete={handleTaskComplete}
                                    onTaskCreate={handleTaskCreate}
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* FOOTER: Project Header (Progress Tool) */}
                <div className="flex-none pb-8">
                    <ProjectHeader project={project} />
                </div>
            </div>

            <TaskCreateModal
                projectId={project.id}
                isOpen={showTaskCreateModal}
                onClose={() => setShowTaskCreateModal(false)}
                initialDate={selectedDateForTask}
            />
        </div>
    );
}
