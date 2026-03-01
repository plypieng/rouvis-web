'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { RouvisChatKit, RouvisChatKitRef } from '@/components/RouvisChatKit';
import ProjectHeader from '@/components/projects/ProjectHeader';
import ProjectCalendar from '@/components/projects/ProjectCalendar';
import ReplanScheduleDialog from '@/components/projects/ReplanScheduleDialog';
import ScheduleGenerationTracePanel from '@/components/projects/ScheduleGenerationTracePanel';
import ScheduleHistoryPanel from '@/components/projects/ScheduleHistoryPanel';
import ProjectEditModal from '@/components/projects/ProjectEditModal';
import ProjectLedgerPanel from '@/components/projects/ProjectLedgerPanel';
import ProjectAnalyticsPanel from '@/components/projects/ProjectAnalyticsPanel';
import ProjectSettingsPanel from '@/components/projects/ProjectSettingsPanel';
import TaskCreateModal from './TaskCreateModal';
import type {
    CockpitPanelMode,
    CommandHandshake,
    QuickApplyResult,
    QuickApplyState,
} from '@/types/project-cockpit';

type ProjectTabMode = 'cockpit' | 'ledger' | 'analytics' | 'settings';
import { toastError, toastSuccess } from '@/lib/feedback';
import { trackUXEvent } from '@/lib/analytics';
import {
    trackSuggestionAccepted,
    trackSuggestionCompleted,
    trackSuggestionEdited,
    trackSuggestionRejected,
    trackSuggestionSlipped,
    trackSuggestionSuggested,
} from '@/lib/suggestion-lifecycle-telemetry';

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
    primaryFieldId?: string | null;
    tasks?: ProjectTask[];
    currentStage?: string;
    schedulingPreferences?: ProjectSchedulingPreferences;
};

interface ProjectDetailClientProps {
    project: Project;
    locale: string;
    chatCockpitStandoutEnabled?: boolean;
}

type NoticeState = {
    type: 'success' | 'error' | 'info';
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

export default function ProjectDetailClient({
    project,
    locale,
    chatCockpitStandoutEnabled = false,
}: ProjectDetailClientProps) {
    const t = useTranslations('projects');
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [showTaskCreateModal, setShowTaskCreateModal] = useState(false);
    const [selectedDateForTask, setSelectedDateForTask] = useState<Date | undefined>(undefined);
    const [taskInitialData, setTaskInitialData] = useState<{ title: string; description?: string } | undefined>(undefined);
    const [notice, setNotice] = useState<NoticeState>(null);
    const [panelMode, setPanelMode] = useState<CockpitPanelMode>('chat');
    const [tabMode, setTabMode] = useState<ProjectTabMode>('cockpit');
    const [splitRatio, setSplitRatio] = useState(DEFAULT_SPLIT);
    const [isResizing, setIsResizing] = useState(false);
    const [quickApplyState, setQuickApplyState] = useState<QuickApplyState>({ status: 'idle' });
    const [activeHandshake, setActiveHandshake] = useState<CommandHandshake | null>(null);
    const [hasCompletedTask, setHasCompletedTask] = useState(
        () => (project.tasks || []).some((task) => task.status === 'completed')
    );
    const [showReplanDialog, setShowReplanDialog] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [generationRunId, setGenerationRunId] = useState<string | null>(null);
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

        const tab = searchParams?.get('tab');
        if (tab === 'settings' || tab === 'cockpit') {
            setTabMode(tab);
        }
    }, [searchParams]);

    useEffect(() => {
        const runId = searchParams?.get('generationRunId');
        setGenerationRunId(runId && runId.trim() ? runId : null);
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

    const updateTabQuery = useCallback((mode: ProjectTabMode) => {
        const params = new URLSearchParams(searchParams?.toString() || '');
        if (mode === 'cockpit') params.delete('tab');
        else params.set('tab', mode);
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
        setTabMode(mode);
    }, [pathname, router, searchParams]);

    const updateGenerationRunQuery = useCallback((nextRunId: string | null) => {
        const params = new URLSearchParams(searchParams?.toString() || '');
        if (nextRunId) {
            params.set('generationRunId', nextRunId);
        } else {
            params.delete('generationRunId');
        }
        const nextQuery = params.toString();
        router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
        setGenerationRunId(nextRunId);
    }, [pathname, router, searchParams]);

    const commitSplitRatio = useCallback((ratio: number) => {
        const clamped = clampSplitRatio(ratio);
        setSplitRatio(clamped);
        if (typeof window !== 'undefined') {
            window.localStorage.setItem(COCKPIT_SPLIT_KEY, String(clamped));
        }
    }, []);

    const buildSuggestionTelemetryBase = useCallback(() => ({
        suggestionId: activeHandshake?.id || `project-${project.id}-reschedule`,
        suggestionType: 'reschedule_plan',
        surface: 'project_detail',
        projectId: project.id,
        affectedTasks: activeHandshake?.affectedTasks.length,
        riskTone: activeHandshake?.riskTone || 'safe',
    }), [activeHandshake, project.id]);

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
            void trackUXEvent('command_handshake_preview_clicked', {
                surface: 'project_detail',
                projectId: project.id,
                hasPrompt: Boolean(message),
            });
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
            const affectedByActiveSuggestion = Boolean(
                activeHandshake?.affectedTasks.some((task) => task.id === taskId)
            );
            if (status === 'completed') {
                toastSuccess(t('task_completed_notice'));
                void trackUXEvent('task_completed', {
                    surface: 'project_detail',
                    projectId: project.id,
                    taskId,
                });
                if (affectedByActiveSuggestion) {
                    void trackSuggestionCompleted({
                        ...buildSuggestionTelemetryBase(),
                        taskId,
                    });
                }
                if (!hasCompletedTask) {
                    setHasCompletedTask(true);
                    void trackUXEvent('first_task_completed', {
                        surface: 'project_detail',
                        projectId: project.id,
                        taskId,
                    });
                }
            } else if (affectedByActiveSuggestion) {
                void trackSuggestionSlipped({
                    ...buildSuggestionTelemetryBase(),
                    taskId,
                    reason: 'task_marked_pending',
                });
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
                actionLabel: t('retry'),
                onAction: retry,
            });
            toastError(message, {
                label: t('retry'),
                onClick: retry,
            });
        }
    };

    const handleTaskCreate = (date: Date, initialData?: { title: string; description?: string }) => {
        setSelectedDateForTask(date);
        setTaskInitialData(initialData);
        setShowTaskCreateModal(true);
    };

    const handleReplanCompleted = useCallback((result: {
        taskCount?: number;
        mode: 'replace_open' | 'replace_all';
        asyncAccepted?: boolean;
        generationRunId?: string;
    }) => {
        if (result.asyncAccepted && result.generationRunId) {
            setNotice({
                type: 'info',
                message: '再計画を受け付けました。進捗を追跡しています。',
            });
            updateGenerationRunQuery(result.generationRunId);
            return;
        }

        setNotice({
            type: 'success',
            message: t('replan_completed_notice', {
                count: result.taskCount ?? 0,
                mode: result.mode === 'replace_all' ? t('replan_mode_replace_all') : t('replan_mode_replace_open'),
            }),
        });
        router.refresh();
    }, [router, t, updateGenerationRunQuery]);

    const handleQuickApplyRequest = useCallback(async (prompt: string): Promise<QuickApplyResult> => {
        if (!chatRef.current) {
            setQuickApplyState({ status: 'error', reason: t('calendar.quick_apply_chat_unavailable') });
            return { applied: false, reason: 'chat_unavailable' };
        }

        setPanelMode('chat');
        updatePanelQuery('chat');
        setQuickApplyState({ status: 'running' });
        const suggestionTelemetryBase = buildSuggestionTelemetryBase();
        const trimmedPrompt = prompt?.trim() || '';
        const handshakePrompt = activeHandshake?.prompt?.trim() || '';
        if (trimmedPrompt && handshakePrompt && trimmedPrompt !== handshakePrompt) {
            void trackSuggestionEdited({
                ...suggestionTelemetryBase,
                editKind: 'prompt_adjusted',
            });
        }
        void trackUXEvent('command_handshake_apply_clicked', {
            surface: 'project_detail',
            projectId: project.id,
            hasPrompt: Boolean(prompt?.trim()),
        });

        const result = await chatRef.current.runRescheduleQuickApply({
            prompt,
            confirmMessage: t('calendar.quick_apply_confirm_message'),
        });

        if (result.applied) {
            setQuickApplyState({ status: 'success', reason: t('calendar.quick_apply_success') });
            router.refresh();
            void trackUXEvent('command_handshake_apply_result', {
                surface: 'project_detail',
                projectId: project.id,
                applied: true,
            });
            void trackSuggestionAccepted(suggestionTelemetryBase);
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
        void trackUXEvent('command_handshake_apply_result', {
            surface: 'project_detail',
            projectId: project.id,
            applied: false,
            reason: result.reason || 'unknown',
        });
        const rejectionReason = result.reason || 'unknown';
        void trackSuggestionRejected({
            ...suggestionTelemetryBase,
            reason: rejectionReason,
        });
        if (rejectionReason === 'no_plan' || rejectionReason === 'proposal_failed') {
            void trackSuggestionSlipped({
                ...suggestionTelemetryBase,
                taskId: activeHandshake?.affectedTasks[0]?.id || 'unknown',
                reason: rejectionReason,
            });
        }
        return result;
    }, [activeHandshake, buildSuggestionTelemetryBase, project.id, router, t, updatePanelQuery]);

    const handleCommandHandshakeChange = useCallback((handshake: CommandHandshake | null) => {
        setActiveHandshake(handshake);
        if (!handshake) return;
        void trackUXEvent('command_handshake_exposed', {
            surface: 'project_detail',
            projectId: project.id,
            affectedTasks: handshake.affectedTasks.length,
            tone: handshake.riskTone || 'safe',
        });
        void trackSuggestionSuggested({
            suggestionId: handshake.id,
            suggestionType: 'reschedule_plan',
            surface: 'project_detail',
            projectId: project.id,
            affectedTasks: handshake.affectedTasks.length,
            riskTone: handshake.riskTone || 'safe',
        });
    }, [project.id]);

    const hasTasks = Boolean(project.tasks?.length);
    const handleGenerationSucceeded = useCallback(() => {
        updateGenerationRunQuery(null);
        router.refresh();
    }, [router, updateGenerationRunQuery]);

    const generationProgressPanel = generationRunId ? (
        <ScheduleGenerationTracePanel
            runId={generationRunId}
            variant={hasTasks ? 'banner' : 'card'}
            onRunIdChange={updateGenerationRunQuery}
            onSucceeded={handleGenerationSucceeded}
        />
    ) : null;

    const chatPane = (
        <div id="project-chat-kit" data-testid="project-cockpit-chat-pane" className="flex h-full min-h-0 flex-col">
            <RouvisChatKit
                ref={chatRef}
                className="surface-base h-full flex-1 overflow-hidden"
                projectId={project.id}
                memoryRecallScope="project"
                onTaskUpdate={() => router.refresh()}
                onDraftCreate={(draft) => handleTaskCreate(new Date(), draft)}
                onCommandHandshakeChange={chatCockpitStandoutEnabled ? handleCommandHandshakeChange : undefined}
                density="compact"
                growthStage={project.currentStage}
                standoutMode={chatCockpitStandoutEnabled}
            />
        </div>
    );

    const planningPane = hasTasks ? (
        <div data-testid="project-cockpit-calendar-pane" className="flex h-full min-h-0 flex-col gap-3">
            {generationProgressPanel}
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
                    externalHandshake={chatCockpitStandoutEnabled ? activeHandshake : null}
                />
            </div>
        </div>
    ) : generationRunId ? (
        <div data-testid="project-cockpit-calendar-pane" className="surface-base flex h-full min-h-0 items-center justify-center px-6 py-8">
            <div className="w-full max-w-2xl">
                {generationProgressPanel}
            </div>
        </div>
    ) : (
        <div data-testid="project-cockpit-calendar-pane" className="surface-base flex h-full min-h-0 flex-col items-center justify-center px-6 py-8 text-center">
            <div className="max-w-md space-y-3" data-testid="project-empty-replan-state">
                <p className="text-sm font-semibold uppercase tracking-[0.08em] text-muted-foreground">{t('schedule_empty_badge')}</p>
                <h3 className="text-xl font-semibold text-foreground">{t('schedule_empty_title')}</h3>
                <p className="text-sm text-muted-foreground">{t('schedule_empty_description')}</p>
                <div className="flex flex-wrap justify-center gap-2 pt-1">
                    <button
                        type="button"
                        onClick={() => setShowReplanDialog(true)}
                        className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
                        data-testid="project-empty-replan-cta"
                    >
                        {t('replan_schedule')}
                    </button>
                    <button
                        type="button"
                        onClick={() => updateTabQuery('settings')}
                        className="rounded-md border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-secondary"
                    >
                        {t('tabs.settings')}
                    </button>
                </div>
            </div>
        </div>
    );

    const mobileTabOptions: Array<{ mode: ProjectTabMode; icon: string; label: string }> = [
        { mode: 'cockpit', icon: 'dashboard_customize', label: t('tabs.cockpit') },
        { mode: 'ledger', icon: 'receipt_long', label: t('tabs.ledger') },
        { mode: 'analytics', icon: 'query_stats', label: t('tabs.analytics') },
        { mode: 'settings', icon: 'tune', label: t('tabs.settings') },
    ];

    return (
        <div className="min-h-[calc(100vh-64px)] shell-canvas flex flex-col">
            <div className="shell-main py-3 flex-1 flex flex-col">
                {/* Top Bar: Back Link + Compact ProjectHeader */}
                <div className="mb-3 flex flex-none flex-col gap-3 sm:flex-row sm:items-start">
                    <Link
                        href={`/${locale}/projects`}
                        className="inline-flex w-fit flex-none items-center gap-1 rounded-md px-2 py-1 text-sm font-semibold text-muted-foreground transition hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:mt-1"
                    >
                        <span className="material-symbols-outlined text-lg">arrow_back</span>
                        <span className="hidden sm:inline">{t('back_to_projects')}</span>
                    </Link>

                    {/* Compact Status Bar (Grow) */}
                    <div className="min-w-0 flex-1">
                        <ProjectHeader
                            project={project}
                            compact={true}
                            onReplanSchedule={() => setShowReplanDialog(true)}
                        />
                    </div>
                </div>

                {notice && (
                    <div
                        className={`mb-3 rounded-lg border px-4 py-3 text-sm ${notice.type === 'success'
                            ? 'status-safe'
                            : notice.type === 'info'
                                ? 'status-watch'
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

                <div className="mb-4 flex-none">
                    <div className="sm:hidden">
                        <div
                            data-testid="project-mobile-section-switcher"
                            className="grid grid-cols-2 gap-2"
                            role="tablist"
                            aria-label={t('mobile_section_switcher')}
                        >
                            {mobileTabOptions.map((option) => {
                                const active = tabMode === option.mode;
                                return (
                                    <button
                                        key={option.mode}
                                        type="button"
                                        role="tab"
                                        aria-selected={active}
                                        onClick={() => updateTabQuery(option.mode)}
                                        data-testid={`project-mobile-section-${option.mode}`}
                                        className={`min-h-[56px] rounded-xl border px-3 py-3 text-left transition ${active
                                            ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                                            : 'border-border bg-card text-foreground hover:bg-secondary'
                                            }`}
                                    >
                                        <span className="material-symbols-outlined mb-1 block text-[18px]">
                                            {option.icon}
                                        </span>
                                        <span className="text-sm font-semibold">{option.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="hidden border-b border-border px-2 sm:block">
                        <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                            <button
                                type="button"
                                onClick={() => updateTabQuery('cockpit')}
                                className={`whitespace-nowrap border-b-2 px-1 py-2 text-sm font-medium transition ${tabMode === 'cockpit'
                                    ? 'border-primary text-primary'
                                    : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
                                    }`}
                            >
                                {t('tabs.cockpit')}
                            </button>
                            <button
                                type="button"
                                onClick={() => updateTabQuery('ledger')}
                                className={`whitespace-nowrap border-b-2 px-1 py-2 text-sm font-medium transition ${tabMode === 'ledger'
                                    ? 'border-primary text-primary'
                                    : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
                                    }`}
                            >
                                {t('tabs.ledger')}
                            </button>
                            <button
                                type="button"
                                onClick={() => updateTabQuery('analytics')}
                                className={`whitespace-nowrap border-b-2 px-1 py-2 text-sm font-medium transition ${tabMode === 'analytics'
                                    ? 'border-primary text-primary'
                                    : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
                                    }`}
                            >
                                {t('tabs.analytics')}
                            </button>
                            <button
                                type="button"
                                onClick={() => updateTabQuery('settings')}
                                className={`whitespace-nowrap border-b-2 px-1 py-2 text-sm font-medium transition ${tabMode === 'settings'
                                    ? 'border-primary text-primary'
                                    : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
                                    }`}
                            >
                                {t('tabs.settings')}
                            </button>
                        </nav>
                    </div>
                </div>

                <div data-testid="project-tab-cockpit" className={tabMode === 'cockpit' ? 'contents' : 'hidden'}>
                    <div className="mb-2 lg:hidden">
                        <div className="surface-base mb-3 rounded-2xl p-1.5">
                            <div
                                data-testid="project-mobile-panel-switcher"
                                className="grid grid-cols-2 gap-1"
                                role="tablist"
                                aria-label={t('calendar.mobile_panel_switcher')}
                            >
                                <button
                                    type="button"
                                    role="tab"
                                    aria-selected={panelMode === 'chat'}
                                    onClick={() => {
                                        setPanelMode('chat');
                                        updatePanelQuery('chat');
                                    }}
                                    data-testid="project-mobile-tab-chat"
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
                                    data-testid="project-mobile-tab-calendar"
                                    className={`touch-target rounded-lg px-3 py-2 text-sm font-semibold transition ${panelMode === 'calendar'
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-secondary text-secondary-foreground hover:bg-secondary/75'
                                        }`}
                                >
                                    {t('calendar.mobile_tab_calendar')}
                                </button>
                            </div>
                        </div>

                        <div className="h-[min(72dvh,42rem)] min-h-[440px] sm:min-h-[500px]">
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


                {tabMode === 'ledger' ? (
                    <div data-testid="project-tab-ledger" className="flex-1 min-h-[640px] pt-4 pb-6 px-4 overflow-y-auto w-full">
                        <div className="max-w-3xl mx-auto">
                            <ProjectLedgerPanel projectId={project.id} />
                        </div>
                    </div>
                ) : null}

                {tabMode === 'analytics' ? (
                    <div data-testid="project-tab-analytics" className="flex-1 min-h-[640px] pt-4 pb-6 px-4 overflow-y-auto w-full">
                        <div className="max-w-3xl mx-auto">
                            <ProjectAnalyticsPanel projectId={project.id} />
                        </div>
                    </div>
                ) : null}

                {tabMode === 'settings' ? (
                    <div data-testid="project-tab-settings" className="flex-1 min-h-[640px] pt-4 pb-6 px-4 overflow-y-auto w-full">
                        <div className="max-w-3xl mx-auto">
                            <ProjectSettingsPanel
                                project={project}
                                onEditProject={() => setShowEditModal(true)}
                                onReplanSchedule={() => setShowReplanDialog(true)}
                                onResetSchedule={() => {
                                    if (confirm(t('settings.reset_confirm'))) {
                                        fetch(`/api/v1/projects/${project.id}/tasks`, {
                                            method: 'DELETE',
                                        }).then((res) => {
                                            if (res.ok) {
                                                toastSuccess(t('settings.reset_success'));
                                                router.refresh();
                                            } else {
                                                toastError(t('settings.reset_failed'));
                                            }
                                        }).catch(() => toastError(t('settings.reset_failed')));
                                    }
                                }}
                                onArchiveProject={() => {
                                    if (confirm(t('confirm_archive_message', { name: project.name }))) {
                                        fetch(`/api/v1/projects/${project.id}`, {
                                            method: 'PUT',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ status: 'archived' }),
                                        }).then((res) => {
                                            if (res.ok) {
                                                toastSuccess(t('archive_success'));
                                                router.push(`/${locale}/projects`);
                                            } else {
                                                toastError(t('archive_failed'));
                                            }
                                        }).catch(() => toastError(t('archive_failed')));
                                    }
                                }}
                            />
                        </div>
                    </div>
                ) : null}
            </div>

            <ProjectEditModal
                project={project}
                isOpen={showEditModal}
                onClose={() => setShowEditModal(false)}
            />

            <TaskCreateModal
                projectId={project.id}
                isOpen={showTaskCreateModal}
                onClose={() => setShowTaskCreateModal(false)}
                initialDate={selectedDateForTask}
                initialData={taskInitialData}
            />

            <ReplanScheduleDialog
                open={showReplanDialog}
                onClose={() => setShowReplanDialog(false)}
                hasTasks={hasTasks}
                project={{
                    id: project.id,
                    crop: project.crop,
                    variety: project.variety,
                    startDate: project.startDate,
                    targetHarvestDate: project.targetHarvestDate,
                    notes: project.notes,
                    primaryFieldId: project.primaryFieldId ?? null,
                    schedulingPreferences: project.schedulingPreferences || null,
                }}
                onReplanned={handleReplanCompleted}
            />
        </div >
    );
}
