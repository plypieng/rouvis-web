'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { RouvisChatKit, RouvisChatKitRef } from '@/components/RouvisChatKit';
import ProjectHeader from '@/components/projects/ProjectHeader';
import ProjectCalendar from '@/components/projects/ProjectCalendar';
import ProjectAgentOnboarding from '@/components/projects/ProjectAgentOnboarding';
import TaskCreateModal from './TaskCreateModal';
import ProjectInsightsPanel from './ProjectInsightsPanel';

interface ProjectDetailClientProps {
    project: any;
    locale: string;
}

export default function ProjectDetailClient({ project, locale }: ProjectDetailClientProps) {
    const t = useTranslations('projects');
    const router = useRouter();
    const [showTaskCreateModal, setShowTaskCreateModal] = useState(false);
    const [selectedDateForTask, setSelectedDateForTask] = useState<Date | undefined>(undefined);
    const chatRef = useRef<RouvisChatKitRef>(null);

    const handleAiReschedule = () => {
        if (chatRef.current) {
            chatRef.current.sendMessage('向こう1週間のスケジュールと天気予報を確認して、変更が必要な点があれば提案してください。');
        } else {
            alert(t('ai_reschedule_alert'));
        }
    };

    const handleTaskComplete = async (taskId: string, status: string) => {
        try {
            const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
            const res = await fetch(`${baseUrl}/api/v1/projects/${project.id}/tasks/${taskId}`, {
                method: 'PUT',
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
        <div className="min-h-screen bg-gray-50/50">
            <div className="container mx-auto px-4 py-6 max-w-7xl">
                {/* Back Link */}
                <Link href={`/${locale}/projects`} className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-900 mb-6 transition font-medium text-sm">
                    <span className="material-symbols-outlined text-lg">arrow_back</span>
                    {t('back_to_projects')}
                </Link>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* LEFT COLUMN: Companion Sidebar (Sticky) */}
                    <div id="project-chat-kit" className="lg:col-span-4 lg:sticky lg:top-6 order-2 lg:order-1 h-[calc(100vh-100px)]">
                        <RouvisChatKit
                            ref={chatRef}
                            className="h-full border border-gray-200 rounded-2xl shadow-sm overflow-hidden bg-white"
                            projectId={project.id}
                            onTaskUpdate={() => router.refresh()}
                            density="compact"
                            growthStage={project.currentStage}
                        />
                    </div>

                    {/* RIGHT COLUMN: Main Content */}
                    <div className="lg:col-span-8 order-1 lg:order-2 space-y-8">
                        {/* 1. Header */}
                        <ProjectHeader project={project} />

                        {/* 2. Insights Panel */}
                        <ProjectInsightsPanel
                            project={project}
                            onAskAI={() => {
                                // Scroll chat into view on mobile
                                const chatElement = document.getElementById('project-chat-kit');
                                if (chatElement) {
                                    chatElement.scrollIntoView({ behavior: 'smooth' });
                                }

                                // Send prompt
                                if (chatRef.current) {
                                    chatRef.current.sendMessage('このプロジェクトへのアドバイスをお願いします。');
                                }
                            }}
                        />

                        {/* 3. Onboarding OR Calendar */}
                        {(!project.tasks || project.tasks.length === 0) ? (
                            <ProjectAgentOnboarding
                                projectId={project.id}
                                crop={project.crop}
                                startDate={project.startDate}
                            />
                        ) : (
                            <div className="h-[calc(100vh-200px)]">
                                <ProjectCalendar
                                    startDate={project.startDate}
                                    targetHarvestDate={project.targetHarvestDate}
                                    tasks={project.tasks}
                                    onAiReschedule={handleAiReschedule}
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
            />
        </div>
    );
}
