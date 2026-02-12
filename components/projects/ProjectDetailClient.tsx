'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { RouvisChatKit, RouvisChatKitRef } from '@/components/RouvisChatKit';
import ProjectHeader from '@/components/projects/ProjectHeader';
import ProjectCalendar from '@/components/projects/ProjectCalendar';
import ProjectAgentOnboarding from '@/components/projects/ProjectAgentOnboarding';
import TaskCreateModal from './TaskCreateModal';
import type { CockpitPanelMode, QuickApplyResult, QuickApplyState } from '@/types/project-cockpit';
import { toastError, toastSuccess } from '@/lib/feedback';
import { trackUXEvent } from '@/lib/analytics';

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
    actionLabel?: string;
    onAction?: () => void;
} | null;

const COCKPIT_SPLIT_KEY = 'rouvis:project-cockpit-split';
const DEFAULT_SPLIT = 0.36;
const MIN_SPLIT = 0.28;
const MAX_SPLIT = 0.62;

function clampSplitRatio(value: number): number {
    if (!Number.isFinite(value)) return DEFAULT_SPLIT;
    return Math.min(MAX_SPLIT, Math.max(MIN_SPLIT, value));
}

export default function ProjectDetailClient({ project, locale }: ProjectDetailClientProps) {
    const t = useTranslations('projects');
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [showTaskCreateModal, setShowTaskCreateModal] = useState(false);
    const [selectedDateForTask, setSelectedDateForTask] = useState<Date | undefined>(undefined);
    const [taskInitialData, setTaskInitialData] = useState<{ title: string; description?: string } | undefined>(undefined);
    const [notice, setNotice] = useState<NoticeState>(null);
    const [panelMode, setPanelMode] = useState<CockpitPanelMode>('chat');
    const [splitRatio, setSplitRatio] = useState(DEFAULT_SPLIT);
    const [isResizing, setIsResizing] = useState(false);
    const [quickApplyState, setQuickApplyState] = useState<QuickApplyState>({ status: 'idle' });
    const [hasCompletedTask, setHasCompletedTask] = useState(
        () => (project.tasks || []).some((task) => task.status === 'completed')
    );
    const chatRef = useRef<RouvisChatKitRef>(null);
    const splitContainerRef = useRef<HTMLDivElement>(null);
    const resizeStateRef = useRef<{ startX: number; startRatio: number } | null>(null);

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    useEffect(() => {
        if (!notice) return;
        const timeout = setTimeout(() => setNotice(null), 4000);
        return () => clearTimeout(timeout);
    }, [notice]);

    useEffect(() => {
        const panel = searchParams?.get('panel');
        if (panel === 'chat' || panel === 'calendar') {
            setPanelMode(panel);
        }
    }, [searchParams]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const saved = Number.parseFloat(window.localStorage.getItem(COCKPIT_SPLIT_KEY) || '');
        if (Number.isFinite(saved)) {
            setSplitRatio(clampSplitRatio(saved));
        }
    }, []);

    useEffect(() => {
        if (!isResizing) return;

        const onPointerMove = (event: MouseEvent) => {
            const container = splitContainerRef.current;
            const resize = resizeStateRef.current;
            if (!container || !resize) return;
            const width = container.getBoundingClientRect().width;
            if (width <= 0) return;
            const deltaRatio = (event.clientX - resize.startX) / width;
            setSplitRatio(clampSplitRatio(resize.startRatio + deltaRatio));
        };

        const onPointerUp = () => {
            setIsResizing(false);
            if (typeof window !== 'undefined') {
                window.localStorage.setItem(COCKPIT_SPLIT_KEY, String(splitRatio));
            }
        };

        window.addEventListener('mousemove', onPointerMove);
        window.addEventListener('mouseup', onPointerUp);

        return () => {
            window.removeEventListener('mousemove', onPointerMove);
            window.removeEventListener('mouseup', onPointerUp);
        };
    }, [isResizing, splitRatio]);

    useEffect(() => {
        if (quickApplyState.status === 'idle') return;
        if (quickApplyState.status === 'running') return;
        const timeout = setTimeout(() => setQuickApplyState({ status: 'idle' }), 3000);
        return () => clearTimeout(timeout);
    }, [quickApplyState.status]);

    const updatePanelQuery = useCallback((mode: CockpitPanelMode) => {
        const params = new URLSearchParams(searchParams?.toString() || '');
        params.set('panel', mode);
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }, [pathname, router, searchParams]);

    const commitSplitRatio = useCallback((ratio: number) => {
        const clamped = clampSplitRatio(ratio);
        setSplitRatio(clamped);
        if (typeof window !== 'undefined') {
            window.localStorage.setItem(COCKPIT_SPLIT_KEY, String(clamped));
        }
    }, []);

    const handleRescheduleRequest = (message?: string) => {
        if (chatRef.current) {
            // Activate Reschedule Mode with visual banner
            chatRef.current.setChatMode('reschedule');

            // Set specific suggestions for rescheduling context
            chatRef.current.setSuggestions([
                {
                    label: t('calendar.reschedule_suggestion_weather_label'),
                    message: t('calendar.reschedule_suggestion_weather_message'),
                },
                {
                    label: t('calendar.reschedule_suggestion_priority_label'),
                    message: t('calendar.reschedule_suggestion_priority_message'),
                },
                { label: t('calendar.reschedule_suggestion_cancel'), message: '', isCancel: true }
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
            if (status === 'completed') {
                toastSuccess('タスクを完了にしました。');
                void trackUXEvent('task_completed', {
                    surface: 'project_detail',
                    projectId: project.id,
                    taskId,
                });
                if (!hasCompletedTask) {
                    setHasCompletedTask(true);
                    void trackUXEvent('first_task_completed', {
                        surface: 'project_detail',
                        projectId: project.id,
                        taskId,
                    });
                }
            }
            setNotice({
                type: 'success',
                message: status === 'completed' ? t('task_completed_notice') : t('task_updated_notice'),
            });
        } catch (error) {
            console.error('Failed to update task', error);
            const retry = () => {
                void handleTaskComplete(taskId, status);
            };
            const message = t('update_failed');
            setNotice({
                type: 'error',
                message,
                actionLabel: '再試行',
                onAction: retry,
            });
            toastError(message, {
                label: '再試行',
                onClick: retry,
            });
        }
    };

    const handleTaskCreate = (date: Date, initialData?: { title: string; description?: string }) => {
        setSelectedDateForTask(date);
        setTaskInitialData(initialData);
        setShowTaskCreateModal(true);
    };

    const handleQuickApplyRequest = useCallback(async (prompt: string): Promise<QuickApplyResult> => {
        if (!chatRef.current) {
            setQuickApplyState({ status: 'error', reason: t('calendar.quick_apply_chat_unavailable') });
            return { applied: false, reason: 'chat_unavailable' };
        }

        setPanelMode('chat');
        updatePanelQuery('chat');
        setQuickApplyState({ status: 'running' });

        const result = await chatRef.current.runRescheduleQuickApply({
            prompt,
            confirmMessage: t('calendar.quick_apply_confirm_message'),
        });

        if (result.applied) {
            setQuickApplyState({ status: 'success', reason: t('calendar.quick_apply_success') });
            router.refresh();
            return result;
        }

        const reasonMap: Record<string, string> = {
            in_flight: t('calendar.quick_apply_error_in_flight'),
            no_plan: t('calendar.quick_apply_error_no_plan'),
            proposal_failed: t('calendar.quick_apply_error_proposal_failed'),
            apply_failed: t('calendar.quick_apply_error_apply_failed'),
            apply_unconfirmed: t('calendar.quick_apply_error_unconfirmed'),
            missing_prompt: t('calendar.quick_apply_error_missing_prompt'),
            chat_unavailable: t('calendar.quick_apply_chat_unavailable'),
        };
        setQuickApplyState({
            status: 'error',
            reason: reasonMap[result.reason || ''] || t('calendar.quick_apply_error_generic'),
        });
        return result;
    }, [router, t, updatePanelQuery]);

    const hasTasks = Boolean(project.tasks?.length);

    const chatPane = (
        <div id="project-chat-kit" className="flex h-full min-h-0 flex-col">
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
    );

    const planningPane = hasTasks ? (
        <div className="surface-base h-full min-h-0 overflow-hidden">
            <ProjectCalendar
                startDate={project.startDate}
                targetHarvestDate={project.targetHarvestDate}
                tasks={project.tasks || []}
                project={project}
                onRescheduleRequest={handleRescheduleRequest}
                onTaskComplete={handleTaskComplete}
                onTaskCreate={handleTaskCreate}
                onQuickApplyRequest={handleQuickApplyRequest}
                quickApplyState={quickApplyState}
            />
        </div>
    ) : (
        <ProjectAgentOnboarding
            projectId={project.id}
            crop={project.crop}
            startDate={project.startDate}
            initialPreferences={project.schedulingPreferences || null}
        />
    );

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
                        <div className="flex items-center justify-between gap-3">
                            <span>{notice.message}</span>
                            {notice.actionLabel && notice.onAction && (
                                <button
                                    type="button"
                                    onClick={notice.onAction}
                                    className="rounded-md border border-current px-2 py-1 text-xs font-semibold hover:bg-white/40"
                                >
                                    {notice.actionLabel}
                                </button>
                            )}
                        </div>
                    </div>
                )}

                <div className="mb-2 lg:hidden">
                    <div className="surface-base mb-3 p-1">
                        <div className="grid grid-cols-2 gap-1" role="tablist" aria-label={t('calendar.mobile_panel_switcher')}>
                            <button
                                type="button"
                                role="tab"
                                aria-selected={panelMode === 'chat'}
                                onClick={() => {
                                    setPanelMode('chat');
                                    updatePanelQuery('chat');
                                }}
                                className={`touch-target rounded-lg px-3 py-2 text-sm font-semibold transition ${panelMode === 'chat'
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/75'
                                    }`}
                            >
                                {t('calendar.mobile_tab_chat')}
                            </button>
                            <button
                                type="button"
                                role="tab"
                                aria-selected={panelMode === 'calendar'}
                                onClick={() => {
                                    setPanelMode('calendar');
                                    updatePanelQuery('calendar');
                                }}
                                className={`touch-target rounded-lg px-3 py-2 text-sm font-semibold transition ${panelMode === 'calendar'
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/75'
                                    }`}
                            >
                                {t('calendar.mobile_tab_calendar')}
                            </button>
                        </div>
                    </div>

                    <div className="h-[calc(100vh-210px)] min-h-[520px]">
                        {panelMode === 'chat' ? chatPane : planningPane}
                    </div>
                </div>

                <div
                    ref={splitContainerRef}
                    className="mb-2 hidden h-[calc(100vh-120px)] min-h-[640px] lg:grid"
                    style={{ gridTemplateColumns: `${Math.round(splitRatio * 1000) / 10}% 12px minmax(0,1fr)` }}
                >
                    <div className="min-h-0 pr-1">
                        {chatPane}
                    </div>

                    <div
                        role="separator"
                        aria-orientation="vertical"
                        aria-label={t('calendar.desktop_splitter_label')}
                        aria-valuemin={Math.round(MIN_SPLIT * 100)}
                        aria-valuemax={Math.round(MAX_SPLIT * 100)}
                        aria-valuenow={Math.round(splitRatio * 100)}
                        tabIndex={0}
                        onMouseDown={(event) => {
                            resizeStateRef.current = { startX: event.clientX, startRatio: splitRatio };
                            setIsResizing(true);
                        }}
                        onKeyDown={(event) => {
                            if (event.key === 'ArrowLeft') {
                                event.preventDefault();
                                commitSplitRatio(splitRatio - 0.03);
                            }
                            if (event.key === 'ArrowRight') {
                                event.preventDefault();
                                commitSplitRatio(splitRatio + 0.03);
                            }
                        }}
                        className={`group relative mx-auto h-full w-[8px] cursor-col-resize rounded-full transition ${isResizing ? 'bg-primary/50' : 'bg-border/70 hover:bg-primary/35'
                            } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
                    >
                        <span className="absolute left-1/2 top-1/2 h-14 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-muted-foreground/45 group-hover:bg-primary" />
                    </div>

                    <div className="min-h-0 pl-1">
                        {planningPane}
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
