import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { cookies } from 'next/headers';

import DashboardHeader from './DashboardHeader';
import TodayCommandCenter, {
    type TodayCommandTask,
    type TodayNextBestAction,
} from './TodayCommandCenter';
import FirstWeekChecklist, { type ChecklistItem } from './FirstWeekChecklist';
import SeasonalMemoryPanel, {
    type SeasonalMemoryInsight,
    type SeasonalMemoryReminder,
} from './SeasonalMemoryPanel';
import TrackedEventLink from './TrackedEventLink';
import { resolveFarmerUiMode } from '@/lib/farmerUiMode';
import { getServerAppBaseUrl } from '@/lib/server-app-base-url';
import type { FarmerUiMode } from '@/types/farmer-ui-mode';

interface Project {
    id: string;
    name: string;
    crop: string;
    variety?: string;
    startDate: string;
    status: string;
    createdAt?: string;
}

type DashboardTask = {
    id: string;
    title: string;
    dueAt: string;
    status: string;
    projectId?: string;
    projectName?: string;
};

type DashboardActivity = {
    id: string;
    type?: string;
    timestamp?: string;
    projectId?: string;
    projectName?: string;
    note?: string;
};

type UserProfile = {
    createdAt?: string;
    experienceLevel?: string | null;
    uiMode?: string | null;
};

type ProfilePayload = {
    profile: UserProfile | null;
    resolvedUiMode?: FarmerUiMode;
};

type WeatherData = {
    location: string;
    temperature: { max: number; min: number };
    condition: string;
    alerts: string[];
    forecast: Array<{
        date: string;
        temperature: { min: number; max: number };
        condition: string;
        icon: string;
    }>;
};

type WeatherCopy = {
    fallbackLocation: string;
    unknownCondition: string;
    fetchFailedCondition: string;
};

type ActivationContext = {
    enabled?: boolean;
    projectId?: string;
    taskId?: string;
};

type RiskTone = 'safe' | 'watch' | 'warning' | 'critical';
type CropStage = 'seedling' | 'vegetative' | 'flowering' | 'ripening' | 'harvest';

type ProjectOpsSummary = {
    nextTask: DashboardTask | null;
    overdueCount: number;
    dueIn48hCount: number;
    unscheduledCount: number;
    risk: RiskTone;
};

type LoadResult<T> = {
    data: T;
    hasError: boolean;
};

function toEpoch(raw: string | undefined): number {
    if (!raw) return Number.POSITIVE_INFINITY;
    const parsed = new Date(raw).getTime();
    return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
}

function toDateLabel(raw: string | undefined, locale: string, fallback: string): string {
    const epoch = toEpoch(raw);
    if (!Number.isFinite(epoch)) return fallback;
    return new Date(epoch).toLocaleDateString(locale, { month: 'numeric', day: 'numeric' });
}

function buildRiskTone({
    overdueCount,
    dueIn48hCount,
    weatherAlertCount,
}: {
    overdueCount: number;
    dueIn48hCount: number;
    weatherAlertCount: number;
}): RiskTone {
    if (overdueCount >= 2 || (weatherAlertCount >= 2 && dueIn48hCount > 0)) return 'critical';
    if (overdueCount >= 1 || weatherAlertCount >= 1 || dueIn48hCount >= 4) return 'warning';
    if (dueIn48hCount > 0) return 'watch';
    return 'safe';
}

function riskBadgeClass(tone: RiskTone): string {
    if (tone === 'critical') return 'border-red-200 bg-red-50 text-red-700';
    if (tone === 'warning') return 'border-amber-200 bg-amber-50 text-amber-700';
    if (tone === 'watch') return 'border-blue-200 bg-blue-50 text-blue-700';
    return 'border-emerald-200 bg-emerald-50 text-emerald-700';
}

function inferCropStage(startDateRaw: string | undefined): CropStage {
    if (!startDateRaw) return 'seedling';
    const startEpoch = new Date(startDateRaw).getTime();
    if (!Number.isFinite(startEpoch)) return 'seedling';

    const ageDays = Math.max(0, Math.floor((Date.now() - startEpoch) / (1000 * 60 * 60 * 24)));
    if (ageDays <= 21) return 'seedling';
    if (ageDays <= 60) return 'vegetative';
    if (ageDays <= 100) return 'flowering';
    if (ageDays <= 140) return 'ripening';
    return 'harvest';
}

function normalizeActivityType(raw: string | undefined): string {
    if (!raw) return '';
    const normalized = raw
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    if (!normalized) return '';
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function buildTodayChatHref(locale: string, prompt: string): string {
    const query = new URLSearchParams({
        intent: 'today',
        prompt,
    });
    return `/${locale}/chat?${query.toString()}`;
}

function withCookieHeaders(cookieHeader: string): HeadersInit | undefined {
    if (!cookieHeader) return undefined;
    return { Cookie: cookieHeader };
}

function requestTimeoutSignal(ms = 4500): AbortSignal | undefined {
    if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
        return AbortSignal.timeout(ms);
    }
    return undefined;
}

type RetryableFetchError = Error & { retryable?: boolean };

function isRetryableProjectFetchError(error: unknown): boolean {
    if (typeof error === 'object' && error !== null && (error as RetryableFetchError).retryable === true) {
        return true;
    }
    if (!(error instanceof Error)) {
        return false;
    }

    const normalizedMessage = error.message.toLowerCase();
    return normalizedMessage.includes('timeout')
        || normalizedMessage.includes('aborted')
        || normalizedMessage.includes('fetch failed')
        || normalizedMessage.includes('network');
}

async function getProjects(appBaseUrl: string, cookieHeader: string): Promise<LoadResult<Project[]>> {
    const requestTimeouts = [8000, 12000];
    let lastError: unknown = null;

    for (const timeoutMs of requestTimeouts) {
        try {
            const res = await fetch(`${appBaseUrl}/api/v1/projects`, {
                cache: 'no-store',
                headers: withCookieHeaders(cookieHeader),
                signal: requestTimeoutSignal(timeoutMs),
            });

            if (!res.ok) {
                const error: RetryableFetchError = new Error(`Failed to fetch projects (${res.status})`);
                error.retryable = res.status >= 500 || res.status === 429;
                throw error;
            }

            const data = await res.json();
            return {
                data: (data.projects || []) as Project[],
                hasError: false,
            };
        } catch (error) {
            lastError = error;
            if (!isRetryableProjectFetchError(error) || timeoutMs === requestTimeouts[requestTimeouts.length - 1]) {
                break;
            }
        }
    }

    console.error('Failed to fetch projects:', lastError);
    return {
        data: [],
        hasError: true,
    };
}

async function getWeather(appBaseUrl: string, cookieHeader: string, copy: WeatherCopy): Promise<LoadResult<WeatherData>> {
    try {
        const res = await fetch(`${appBaseUrl}/api/weather/overview`, {
            next: { revalidate: 3600 },
            headers: withCookieHeaders(cookieHeader),
            signal: requestTimeoutSignal(),
        });

        if (!res.ok) throw new Error(`Failed to fetch weather (${res.status})`);
        const data = await res.json();

        const daily = Array.isArray(data.daily) ? data.daily : [];
        const fallbackForecast = Array.isArray(data.forecast) ? data.forecast : [];
        const today = daily[0];
        const mappedForecast = daily.length > 0
            ? daily.map((day: any) => ({
                date: day.date,
                temperature: day.temperature,
                condition: day?.condition?.label || day.condition || copy.unknownCondition,
                icon: day?.condition?.icon || day.icon || '03d',
                precipitation: day?.precipitationMm ?? day.precipitation ?? 0,
            }))
            : fallbackForecast.map((day: any) => ({
                date: day.date,
                temperature: day.temperature,
                condition: day?.condition?.label || day.condition || copy.unknownCondition,
                icon: day?.condition?.icon || day.icon || '03d',
            }));

        return {
            data: {
                location: data?.location?.label || data.location || copy.fallbackLocation,
                temperature: {
                    max: today?.temperature?.max ?? 0,
                    min: today?.temperature?.min ?? 0,
                },
                condition: data?.current?.condition?.label || data.condition || copy.unknownCondition,
                alerts: Array.isArray(data.alerts)
                    ? data.alerts.map((alert: any) => alert?.title || alert?.message || String(alert))
                    : [],
                forecast: mappedForecast,
            },
            hasError: false,
        };
    } catch (error) {
        console.error('Failed to fetch weather:', error);
        return {
            data: {
                location: copy.fallbackLocation,
                temperature: { max: 0, min: 0 },
                condition: copy.fetchFailedCondition,
                alerts: [],
                forecast: [],
            },
            hasError: true,
        };
    }
}

async function getTasks(appBaseUrl: string, cookieHeader: string): Promise<LoadResult<DashboardTask[]>> {
    try {
        const res = await fetch(`${appBaseUrl}/api/v1/tasks`, {
            cache: 'no-store',
            headers: withCookieHeaders(cookieHeader),
            signal: requestTimeoutSignal(),
        });

        if (!res.ok) throw new Error(`Failed to fetch tasks (${res.status})`);
        const data = await res.json();
        return {
            data: (data.tasks || []) as DashboardTask[],
            hasError: false,
        };
    } catch (error) {
        console.error('Failed to fetch tasks:', error);
        return {
            data: [],
            hasError: true,
        };
    }
}

async function getActivities(appBaseUrl: string, cookieHeader: string): Promise<LoadResult<DashboardActivity[]>> {
    try {
        const res = await fetch(`${appBaseUrl}/api/v1/activities`, {
            cache: 'no-store',
            headers: withCookieHeaders(cookieHeader),
            signal: requestTimeoutSignal(),
        });

        if (!res.ok) throw new Error(`Failed to fetch activities (${res.status})`);
        const data = await res.json();
        return {
            data: (data.activities || []) as DashboardActivity[],
            hasError: false,
        };
    } catch (error) {
        console.error('Failed to fetch activities:', error);
        return {
            data: [],
            hasError: true,
        };
    }
}

async function getProfile(appBaseUrl: string, cookieHeader: string): Promise<LoadResult<ProfilePayload>> {
    try {
        const res = await fetch(`${appBaseUrl}/api/v1/profile`, {
            cache: 'no-store',
            headers: withCookieHeaders(cookieHeader),
            signal: requestTimeoutSignal(),
        });

        if (res.status === 404) {
            return {
                data: { profile: null },
                hasError: false,
            };
        }

        if (!res.ok) {
            throw new Error(`Failed to fetch profile (${res.status})`);
        }

        const data = await res.json();
        return {
            data: {
                profile: (data?.profile || null) as UserProfile | null,
                resolvedUiMode: data?.resolvedUiMode as FarmerUiMode | undefined,
            },
            hasError: false,
        };
    } catch (error) {
        console.error('Failed to fetch profile:', error);
        return {
            data: { profile: null },
            hasError: true,
        };
    }
}

async function persistInferredUiMode(appBaseUrl: string, cookieHeader: string, uiMode: FarmerUiMode): Promise<void> {
    try {
        await fetch(`${appBaseUrl}/api/v1/profile`, {
            method: 'POST',
            cache: 'no-store',
            headers: {
                'Content-Type': 'application/json',
                ...(withCookieHeaders(cookieHeader) || {}),
            },
            body: JSON.stringify({ uiMode }),
        });
    } catch (error) {
        console.warn('Failed to persist inferred farmer UI mode:', error);
    }
}

export default async function DashboardProjectList({
    locale,
    forceDataError = false,
    activationContext,
    sessionUiMode,
}: {
    locale: string;
    forceDataError?: boolean;
    activationContext?: ActivationContext;
    sessionUiMode?: FarmerUiMode;
}) {
    const [t, tw] = await Promise.all([
        getTranslations({ locale, namespace: 'dashboard' }),
        getTranslations({ locale, namespace: 'workflow' }),
    ]);
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.getAll().map((cookie) => `${cookie.name}=${cookie.value}`).join('; ');
    const appBaseUrl = await getServerAppBaseUrl();

    const [projectsResult, weatherResult, tasksResult, activitiesResult, profileResult] = await Promise.all([
        getProjects(appBaseUrl, cookieHeader),
        getWeather(appBaseUrl, cookieHeader, {
            fallbackLocation: t('weather_defaults.location'),
            unknownCondition: t('weather_defaults.unknown_condition'),
            fetchFailedCondition: t('weather_defaults.fetch_failed_condition'),
        }),
        getTasks(appBaseUrl, cookieHeader),
        getActivities(appBaseUrl, cookieHeader),
        getProfile(appBaseUrl, cookieHeader),
    ]);

    const projects = projectsResult.data;
    const weather = weatherResult.data;
    const allTasks = tasksResult.data;
    const activities = activitiesResult.data;
    const profilePayload = profileResult.data;
    const profile = profilePayload.profile;
    const inferredProfileMode = profile
        ? resolveFarmerUiMode(profile.uiMode, profile.experienceLevel)
        : undefined;
    const resolvedUiMode = profilePayload.resolvedUiMode
        || inferredProfileMode
        || (sessionUiMode === 'veteran_farmer' ? 'veteran_farmer' : 'new_farmer');
    const isVeteranMode = resolvedUiMode === 'veteran_farmer';
    const dashboardModeTestId = isVeteranMode ? 'dashboard-mode-veteran' : 'dashboard-mode-new';

    if (profile && !profile.uiMode) {
        await persistInferredUiMode(appBaseUrl, cookieHeader, resolvedUiMode);
    }

    const hasDataFetchError = forceDataError
        || projectsResult.hasError
        || weatherResult.hasError
        || tasksResult.hasError
        || activitiesResult.hasError
        || profileResult.hasError;

    const retryHref = `/${locale}?retry=${Date.now().toString()}`;
    const emptyProjectsChatHref = `/${locale}/chat?${new URLSearchParams({
        intent: 'project',
        prompt: t('chat_prompts.first_project'),
    }).toString()}`;

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);
    const nowEpoch = now.getTime();
    const todayStartEpoch = todayStart.getTime();
    const todayEndEpoch = todayEnd.getTime();
    const window48hEndEpoch = nowEpoch + (48 * 60 * 60 * 1000);

    const pendingTasks = allTasks
        .filter((task) => task.status !== 'completed')
        .sort((left, right) => toEpoch(left.dueAt) - toEpoch(right.dueAt));
    const completedTasks = allTasks.filter((task) => task.status === 'completed');
    const dueTodayOrOverduePendingTasks = pendingTasks.filter((task) => toEpoch(task.dueAt) <= todayEndEpoch);
    const overduePendingTasks = pendingTasks.filter((task) => {
        const dueEpoch = toEpoch(task.dueAt);
        return Number.isFinite(dueEpoch) && dueEpoch < todayStartEpoch;
    });
    const dueTodayPendingTasks = pendingTasks.filter((task) => {
        const dueEpoch = toEpoch(task.dueAt);
        return Number.isFinite(dueEpoch) && dueEpoch >= todayStartEpoch && dueEpoch <= todayEndEpoch;
    });
    const dueNext48hPendingTasks = pendingTasks.filter((task) => {
        const dueEpoch = toEpoch(task.dueAt);
        return Number.isFinite(dueEpoch) && dueEpoch > todayEndEpoch && dueEpoch <= window48hEndEpoch;
    });
    const dueIn48hPendingTasks = pendingTasks.filter((task) => {
        const dueEpoch = toEpoch(task.dueAt);
        return Number.isFinite(dueEpoch) && dueEpoch >= todayStartEpoch && dueEpoch <= window48hEndEpoch;
    });
    const windowPressureTasks = pendingTasks.filter((task) => {
        const dueEpoch = toEpoch(task.dueAt);
        return Number.isFinite(dueEpoch) && dueEpoch <= window48hEndEpoch;
    });
    const unscheduledPendingTasks = pendingTasks.filter((task) => !Number.isFinite(toEpoch(task.dueAt)));

    const todayTasks = allTasks.filter((task) => {
        const dueEpoch = toEpoch(task.dueAt);
        return dueEpoch >= todayStartEpoch && dueEpoch <= todayEndEpoch;
    });
    const todayCompletedTasks = todayTasks.filter((task) => task.status === 'completed');

    const activationTask = activationContext?.taskId
        ? pendingTasks.find((task) => task.id === activationContext.taskId) || null
        : null;
    const activationProject = activationContext?.projectId
        ? projects.find((project) => project.id === activationContext.projectId) || null
        : null;
    const activationProjectId = activationTask?.projectId || activationContext?.projectId || null;
    const activationProjectHref = activationProjectId ? `/${locale}/projects/${activationProjectId}` : `/${locale}/projects`;

    const recommendedTaskSource = activationTask || dueTodayOrOverduePendingTasks[0] || null;
    const todayCommandTasks: TodayCommandTask[] = dueTodayOrOverduePendingTasks.map((task) => ({
        id: task.id,
        title: task.title,
        dueAt: task.dueAt,
        projectId: task.projectId,
        projectName: task.projectName,
    }));
    const recommendedTask: TodayCommandTask | null = recommendedTaskSource
        ? {
            id: recommendedTaskSource.id,
            title: recommendedTaskSource.title,
            dueAt: recommendedTaskSource.dueAt,
            projectId: recommendedTaskSource.projectId,
            projectName: recommendedTaskSource.projectName,
        }
        : null;

    const completedTaskExists = completedTasks.length > 0;
    const activitiesCount = activities.length;
    const hasGeneratedSchedule = allTasks.length > 0;

    const createdAt = profile?.createdAt ? new Date(profile.createdAt) : null;
    const daysSinceSignup = createdAt
        ? Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24))
        : null;
    const withinFirstWeek = daysSinceSignup === null || daysSinceSignup <= 7;

    const checklistItems: ChecklistItem[] = [
        {
            id: 'onboarding',
            label: t('checklist.onboarding'),
            done: Boolean(profile),
            href: `/${locale}/onboarding`,
        },
        {
            id: 'project',
            label: t('checklist.project'),
            done: projects.length > 0,
            href: `/${locale}/projects/create`,
        },
        {
            id: 'schedule',
            label: t('checklist.schedule'),
            done: hasGeneratedSchedule,
            href: `/${locale}/projects/create`,
        },
        {
            id: 'task_complete',
            label: t('checklist.task_complete'),
            done: completedTaskExists,
            href: `/${locale}/calendar`,
        },
        {
            id: 'activity',
            label: t('checklist.activity'),
            done: activitiesCount > 0,
            href: `/${locale}/records?action=log`,
        },
    ];

    const firstIncompleteChecklist = checklistItems.find((item) => !item.done) || null;
    const showFirstWeekChecklist = withinFirstWeek || projects.length <= 1;
    const showResumeSetupBanner = Boolean(profile) && Boolean(firstIncompleteChecklist) && !activationContext?.enabled;
    const checklistCompletionHref = buildTodayChatHref(locale, t('chat_prompts.today_priority'));

    const todayProgressTotal = todayTasks.length;
    const todayProgressDone = todayCompletedTasks.length;

    const weatherAlertCount = weather.alerts?.length || 0;
    const dashboardRiskTone = buildRiskTone({
        overdueCount: overduePendingTasks.length,
        dueIn48hCount: dueIn48hPendingTasks.length,
        weatherAlertCount,
    });
    const dashboardWindowTasks = windowPressureTasks.slice(0, 4);
    const dashboardWindowAction = overduePendingTasks.length > 0
        ? {
            href: `/${locale}/calendar`,
            label: t('ops_window.action_recover'),
        }
        : dueIn48hPendingTasks.length > 0
            ? {
                href: `/${locale}/calendar`,
                label: t('ops_window.action_prepare'),
            }
            : {
                href: buildTodayChatHref(locale, t('chat_prompts.today_priority')),
                label: t('ops_window.action_plan'),
            };

    const focusTask = activationTask || recommendedTaskSource || pendingTasks[0] || null;
    const focusProject = focusTask?.projectId
        ? projects.find((project) => project.id === focusTask.projectId) || null
        : activationProject || projects[0] || null;
    const focusStage = inferCropStage(focusProject?.startDate);
    const nextBestActionContextLine = t('next_best_action.context_line', {
        project: focusProject?.name || t('next_best_action.project_unknown'),
        crop: focusProject?.crop || t('next_best_action.crop_unknown'),
        stage: tw(`stages.${focusStage}`),
    });

    const dueIn48hCount = dueIn48hPendingTasks.length;
    const overdueCount = overduePendingTasks.length;
    const nextBestActionPlan: TodayNextBestAction = hasDataFetchError
        ? {
            scenario: 'data_recovery',
            riskTone: overdueCount > 0 ? 'warning' : 'watch',
            riskLabel: tw(overdueCount > 0 ? 'risk.warning' : 'risk.watch'),
            title: t('next_best_action.scenarios.data_recovery.title'),
            summary: t('next_best_action.scenarios.data_recovery.summary'),
            reasons: [
                t('next_best_action.reasons.data_issue'),
                t('next_best_action.reasons.overdue_count', { count: overdueCount }),
                t('next_best_action.reasons.due_48h_count', { count: dueIn48hCount }),
            ],
            contextLine: nextBestActionContextLine,
            recoveryHint: t('next_best_action.recovery_hint'),
            kpi: 'schedule_reliability',
            overdueCount,
            dueIn48hCount,
            weatherAlertCount,
            hasDataIssue: true,
            primary: {
                href: retryHref,
                label: t('next_best_action.scenarios.data_recovery.primary'),
            },
            secondary: {
                href: `/${locale}/calendar`,
                label: t('next_best_action.scenarios.data_recovery.secondary'),
            },
        }
        : overdueCount > 0
            ? {
                scenario: 'overdue_recovery',
                riskTone: dashboardRiskTone === 'critical' ? 'critical' : 'warning',
                riskLabel: tw(dashboardRiskTone === 'critical' ? 'risk.critical' : 'risk.warning'),
                title: t('next_best_action.scenarios.overdue_recovery.title'),
                summary: t('next_best_action.scenarios.overdue_recovery.summary'),
                reasons: [
                    t('next_best_action.reasons.overdue_count', { count: overdueCount }),
                    t('next_best_action.reasons.due_48h_count', { count: dueIn48hCount }),
                    weatherAlertCount > 0
                        ? t('next_best_action.reasons.weather_alert_count', { count: weatherAlertCount })
                        : t('next_best_action.reasons.weather_no_alert'),
                ],
                contextLine: nextBestActionContextLine,
                kpi: 'task_completion',
                overdueCount,
                dueIn48hCount,
                weatherAlertCount,
                hasDataIssue: false,
                primary: {
                    href: `/${locale}/calendar`,
                    label: t('next_best_action.scenarios.overdue_recovery.primary'),
                },
                secondary: {
                    href: buildTodayChatHref(locale, t('chat_prompts.today_priority')),
                    label: t('next_best_action.scenarios.overdue_recovery.secondary'),
                },
            }
            : weatherAlertCount > 0 && dueIn48hCount > 0
                ? {
                    scenario: 'weather_guard',
                    riskTone: dashboardRiskTone === 'safe' ? 'watch' : dashboardRiskTone,
                    riskLabel: tw(dashboardRiskTone === 'safe' ? 'risk.watch' : `risk.${dashboardRiskTone}`),
                    title: t('next_best_action.scenarios.weather_guard.title'),
                    summary: t('next_best_action.scenarios.weather_guard.summary'),
                    reasons: [
                        t('next_best_action.reasons.weather_alert_count', { count: weatherAlertCount }),
                        t('next_best_action.reasons.due_48h_count', { count: dueIn48hCount }),
                        focusTask
                            ? t('next_best_action.reasons.focus_task', { task: focusTask.title })
                            : t('next_best_action.reasons.empty_queue'),
                    ],
                    contextLine: nextBestActionContextLine,
                    kpi: 'schedule_reliability',
                    overdueCount,
                    dueIn48hCount,
                    weatherAlertCount,
                    hasDataIssue: false,
                    primary: {
                        href: `/${locale}/calendar`,
                        label: t('next_best_action.scenarios.weather_guard.primary'),
                    },
                    secondary: {
                        href: buildTodayChatHref(locale, t('chat_prompts.today_priority')),
                        label: t('next_best_action.scenarios.weather_guard.secondary'),
                    },
                }
                : dueIn48hCount > 0
                    ? {
                        scenario: 'due_soon',
                        riskTone: dashboardRiskTone === 'safe' ? 'watch' : dashboardRiskTone,
                        riskLabel: tw(dashboardRiskTone === 'safe' ? 'risk.watch' : `risk.${dashboardRiskTone}`),
                        title: t('next_best_action.scenarios.due_soon.title'),
                        summary: t('next_best_action.scenarios.due_soon.summary'),
                        reasons: [
                            t('next_best_action.reasons.due_48h_count', { count: dueIn48hCount }),
                            t('next_best_action.reasons.weather_no_alert'),
                            focusTask
                                ? t('next_best_action.reasons.focus_task', { task: focusTask.title })
                                : t('next_best_action.reasons.empty_queue'),
                        ],
                        contextLine: nextBestActionContextLine,
                        kpi: 'task_completion',
                        overdueCount,
                        dueIn48hCount,
                        weatherAlertCount,
                        hasDataIssue: false,
                        primary: {
                            href: `/${locale}/calendar`,
                            label: t('next_best_action.scenarios.due_soon.primary'),
                        },
                        secondary: {
                            href: `/${locale}/records?action=log`,
                            label: t('next_best_action.scenarios.due_soon.secondary'),
                        },
                    }
                    : projects.length === 0 || !hasGeneratedSchedule
                        ? {
                            scenario: 'setup',
                            riskTone: 'watch',
                            riskLabel: tw('risk.watch'),
                            title: t('next_best_action.scenarios.setup.title'),
                            summary: t('next_best_action.scenarios.setup.summary'),
                            reasons: [
                                t('next_best_action.reasons.empty_queue'),
                                t('next_best_action.reasons.weather_no_alert'),
                                t('next_best_action.reasons.due_48h_count', { count: dueIn48hCount }),
                            ],
                            contextLine: nextBestActionContextLine,
                            kpi: 'first_week_activation',
                            overdueCount,
                            dueIn48hCount,
                            weatherAlertCount,
                            hasDataIssue: false,
                            primary: {
                                href: `/${locale}/projects/create`,
                                label: t('next_best_action.scenarios.setup.primary'),
                            },
                            secondary: {
                                href: emptyProjectsChatHref,
                                label: t('next_best_action.scenarios.setup.secondary'),
                            },
                        }
                        : {
                            scenario: 'momentum',
                            riskTone: dashboardRiskTone === 'critical' ? 'warning' : 'safe',
                            riskLabel: tw(dashboardRiskTone === 'critical' ? 'risk.warning' : 'risk.safe'),
                            title: t('next_best_action.scenarios.momentum.title'),
                            summary: t('next_best_action.scenarios.momentum.summary'),
                            reasons: [
                                t('next_best_action.reasons.weather_no_alert'),
                                t('next_best_action.reasons.overdue_count', { count: overdueCount }),
                                t('next_best_action.reasons.due_48h_count', { count: dueIn48hCount }),
                            ],
                            contextLine: nextBestActionContextLine,
                            kpi: 'task_completion',
                            overdueCount,
                            dueIn48hCount,
                            weatherAlertCount,
                            hasDataIssue: false,
                            primary: {
                                href: `/${locale}/records?action=log`,
                                label: t('next_best_action.scenarios.momentum.primary'),
                            },
                            secondary: {
                                href: buildTodayChatHref(locale, t('chat_prompts.today_priority')),
                                label: t('next_best_action.scenarios.momentum.secondary'),
                            },
                        };

    const lastSeasonStart = new Date(now);
    lastSeasonStart.setFullYear(lastSeasonStart.getFullYear() - 1);
    lastSeasonStart.setDate(lastSeasonStart.getDate() - 21);
    const lastSeasonEnd = new Date(now);
    lastSeasonEnd.setFullYear(lastSeasonEnd.getFullYear() - 1);
    lastSeasonEnd.setDate(lastSeasonEnd.getDate() + 21);
    const lastSeasonStartEpoch = lastSeasonStart.getTime();
    const lastSeasonEndEpoch = lastSeasonEnd.getTime();

    const seasonalMemoryActivities = activities.filter((activity) => {
        const activityEpoch = toEpoch(activity.timestamp);
        return Number.isFinite(activityEpoch) && activityEpoch >= lastSeasonStartEpoch && activityEpoch <= lastSeasonEndEpoch;
    });
    const recentActivities = activities.slice(0, 8);
    const referenceActivities = seasonalMemoryActivities.length > 0 ? seasonalMemoryActivities : recentActivities;

    const activityFrequency = new Map<string, number>();
    for (const activity of referenceActivities) {
        const normalizedType = normalizeActivityType(activity.type);
        if (!normalizedType) continue;
        activityFrequency.set(normalizedType, (activityFrequency.get(normalizedType) || 0) + 1);
    }
    const topActivityType = [...activityFrequency.entries()].sort((left, right) => right[1] - left[1])[0]?.[0]
        || normalizeActivityType(referenceActivities[0]?.type)
        || t('seasonal_memory.activity_unknown');

    const seasonalPrompt = seasonalMemoryActivities.length > 0
        ? t('chat_prompts.seasonal_memory', { activity: topActivityType })
        : recentActivities.length > 0
            ? t('chat_prompts.seasonal_recent', { activity: topActivityType })
            : t('chat_prompts.seasonal_bootstrap');
    const seasonalMemoryInsight: SeasonalMemoryInsight = seasonalMemoryActivities.length > 0
        ? {
            title: t('seasonal_memory.insight.last_season_title', { count: seasonalMemoryActivities.length }),
            body: t('seasonal_memory.insight.last_season_body', { activity: topActivityType }),
            promptHref: buildTodayChatHref(locale, seasonalPrompt),
            promptLabel: t('seasonal_memory.insight.prompt'),
        }
        : recentActivities.length > 0
            ? {
                title: t('seasonal_memory.insight.recent_title'),
                body: t('seasonal_memory.insight.recent_body', { activity: topActivityType }),
                promptHref: buildTodayChatHref(locale, seasonalPrompt),
                promptLabel: t('seasonal_memory.insight.prompt'),
            }
            : {
                title: t('seasonal_memory.insight.empty_title'),
                body: t('seasonal_memory.insight.empty_body'),
                promptHref: buildTodayChatHref(locale, seasonalPrompt),
                promptLabel: t('seasonal_memory.insight.prompt'),
            };

    const seasonalReminders: SeasonalMemoryReminder[] = [];
    if (seasonalMemoryActivities.length > 0) {
        seasonalReminders.push({
            id: 'seasonal-repeat',
            title: t('seasonal_memory.reminders.seasonal_repeat_title'),
            detail: t('seasonal_memory.reminders.seasonal_repeat_body', {
                activity: topActivityType,
                count: seasonalMemoryActivities.length,
            }),
            href: `/${locale}/calendar`,
            ctaLabel: t('seasonal_memory.reminders.open_calendar'),
            kpi: 'seasonal_readiness',
        });
    }
    if (weatherAlertCount > 0) {
        seasonalReminders.push({
            id: 'weather-risk',
            title: t('seasonal_memory.reminders.weather_title', { count: weatherAlertCount }),
            detail: t('seasonal_memory.reminders.weather_body'),
            href: `/${locale}/calendar`,
            ctaLabel: t('seasonal_memory.reminders.open_calendar'),
            kpi: 'schedule_reliability',
        });
    }
    if (overdueCount > 0) {
        seasonalReminders.push({
            id: 'overdue-recovery',
            title: t('seasonal_memory.reminders.overdue_title', { count: overdueCount }),
            detail: t('seasonal_memory.reminders.overdue_body'),
            href: `/${locale}/calendar`,
            ctaLabel: t('seasonal_memory.reminders.recover_now'),
            kpi: 'task_completion',
        });
    } else if (dueIn48hCount > 0) {
        seasonalReminders.push({
            id: 'window-check',
            title: t('seasonal_memory.reminders.window_title', { count: dueIn48hCount }),
            detail: t('seasonal_memory.reminders.window_body'),
            href: `/${locale}/calendar`,
            ctaLabel: t('seasonal_memory.reminders.open_calendar'),
            kpi: 'schedule_reliability',
        });
    }
    if (recentActivities.length === 0) {
        seasonalReminders.push({
            id: 'baseline-log',
            title: t('seasonal_memory.reminders.baseline_title'),
            detail: t('seasonal_memory.reminders.baseline_body'),
            href: `/${locale}/records?action=log`,
            ctaLabel: t('seasonal_memory.reminders.log_activity'),
            kpi: 'data_quality',
        });
    }
    const seasonalReminderCards = seasonalReminders.slice(0, 3);

    const projectOpsById = new Map<string, ProjectOpsSummary>();
    for (const project of projects) {
        const projectPendingTasks = pendingTasks.filter((task) => task.projectId === project.id);
        const nextTask = projectPendingTasks.find((task) => Number.isFinite(toEpoch(task.dueAt)))
            || projectPendingTasks[0]
            || null;
        const overdueCount = projectPendingTasks.filter((task) => {
            const dueEpoch = toEpoch(task.dueAt);
            return Number.isFinite(dueEpoch) && dueEpoch < todayStartEpoch;
        }).length;
        const dueIn48hCount = projectPendingTasks.filter((task) => {
            const dueEpoch = toEpoch(task.dueAt);
            return Number.isFinite(dueEpoch) && dueEpoch >= todayStartEpoch && dueEpoch <= window48hEndEpoch;
        }).length;
        const unscheduledCount = projectPendingTasks.filter((task) => !Number.isFinite(toEpoch(task.dueAt))).length;
        const risk = buildRiskTone({
            overdueCount,
            dueIn48hCount,
            weatherAlertCount,
        });
        projectOpsById.set(project.id, {
            nextTask,
            overdueCount,
            dueIn48hCount,
            unscheduledCount,
            risk,
        });
    }

    const contextualBannerSections = (
        <>
            {activationContext?.enabled && (
                <section
                    data-testid="dashboard-activation-banner"
                    className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-emerald-900"
                >
                    <p className="text-sm font-semibold">{t('banners.activation_title')}</p>
                    <p className="mt-1 text-sm">
                        {activationTask
                            ? activationTask.projectName
                                ? t('banners.activation_next_task_with_project', {
                                    task: activationTask.title,
                                    project: activationTask.projectName,
                                })
                                : t('banners.activation_next_task', { task: activationTask.title })
                            : activationProject
                                ? t('banners.activation_next_project', { project: activationProject.name })
                                : t('banners.activation_next_generic')}
                    </p>
                    <TrackedEventLink
                        href={activationProjectHref}
                        eventName="activation_task_opened"
                        eventProperties={{
                            hasTask: Boolean(activationTask),
                            projectId: activationProjectId || '',
                        }}
                        className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-emerald-800 hover:text-emerald-950 hover:underline"
                    >
                        {t('banners.activation_action')}
                        <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </TrackedEventLink>
                </section>
            )}

            {showResumeSetupBanner && firstIncompleteChecklist && (
                <section className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-4 text-blue-900">
                    <p className="text-sm font-semibold">{t('banners.resume_title')}</p>
                    <p className="mt-1 text-sm">{t('banners.resume_body', { step: firstIncompleteChecklist.label })}</p>
                    <TrackedEventLink
                        href={firstIncompleteChecklist.href}
                        eventName="resume_setup_clicked"
                        eventProperties={{ step: firstIncompleteChecklist.id }}
                        className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-blue-800 hover:text-blue-950 hover:underline"
                    >
                        {t('banners.resume_action')}
                        <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </TrackedEventLink>
                </section>
            )}
        </>
    );

    return (
        <div className="min-h-screen bg-background font-sans">
            <DashboardHeader locale={locale} weather={weather} tasks={pendingTasks} mode={resolvedUiMode} />

            <main className="container mx-auto max-w-7xl space-y-8 px-4 py-8" data-testid={dashboardModeTestId}>
                <TodayCommandCenter
                    locale={locale}
                    mode={resolvedUiMode}
                    todayTasks={todayCommandTasks}
                    recommendedTask={recommendedTask}
                    nextBestAction={nextBestActionPlan}
                    todayProgressDone={todayProgressDone}
                    todayProgressTotal={todayProgressTotal}
                    hasCompletedTaskInitially={completedTaskExists}
                />

                <SeasonalMemoryPanel
                    mode={resolvedUiMode}
                    insight={seasonalMemoryInsight}
                    reminders={seasonalReminderCards}
                    hasDataIssue={activitiesResult.hasError}
                    retryHref={retryHref}
                    seasonalMemoryCount={seasonalMemoryActivities.length}
                    recentActivityCount={recentActivities.length}
                />

                {hasDataFetchError && (
                    <div data-testid="dashboard-data-warning" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                        <p className="font-semibold">{t('data_warning.title')}</p>
                        <p className="mt-1">{t('data_warning.body')}</p>
                        <TrackedEventLink
                            href={retryHref}
                            eventName="dashboard_retry_clicked"
                            eventProperties={{ surface: 'dashboard_warning' }}
                            data-testid="dashboard-retry-link"
                            className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-amber-800 hover:text-amber-950 hover:underline"
                        >
                            {t('data_warning.retry')}
                            <span className="material-symbols-outlined text-sm">refresh</span>
                        </TrackedEventLink>
                    </div>
                )}

                {isVeteranMode && contextualBannerSections}

                <section data-testid="dashboard-ops-window" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <h2 className="text-base font-bold text-slate-900">{t('ops_window.title')}</h2>
                            <p className="text-xs text-slate-500">{t('ops_window.subtitle')}</p>
                        </div>
                        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${riskBadgeClass(dashboardRiskTone)}`}>
                            {t('ops_window.risk_prefix')} {tw(`risk.${dashboardRiskTone}`)}
                        </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                            <p className="text-xs text-slate-500">{t('ops_window.overdue')}</p>
                            <p className="mt-1 text-lg font-bold text-slate-900">{overduePendingTasks.length}</p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                            <p className="text-xs text-slate-500">{t('ops_window.due_today')}</p>
                            <p className="mt-1 text-lg font-bold text-slate-900">{dueTodayPendingTasks.length}</p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                            <p className="text-xs text-slate-500">{t('ops_window.due_48h')}</p>
                            <p className="mt-1 text-lg font-bold text-slate-900">{dueNext48hPendingTasks.length}</p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                            <p className="text-xs text-slate-500">{t('ops_window.weather_alerts')}</p>
                            <p className="mt-1 text-lg font-bold text-slate-900">{weatherAlertCount}</p>
                        </div>
                    </div>

                    {dashboardWindowTasks.length > 0 ? (
                        <div className="mt-4 space-y-2">
                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{t('ops_window.priority_list')}</p>
                            {dashboardWindowTasks.map((task) => (
                                <div key={task.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2">
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold text-slate-900">{task.title}</p>
                                        <p className="truncate text-xs text-slate-600">{task.projectName || t('ops_window.unassigned_project')}</p>
                                    </div>
                                    <span className="shrink-0 text-xs font-semibold text-slate-600">
                                        {toDateLabel(task.dueAt, locale, t('ops_window.unscheduled'))}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="mt-4 text-sm text-emerald-700">{t('ops_window.clear_note')}</p>
                    )}

                    {unscheduledPendingTasks.length > 0 && (
                        <p className="mt-3 text-xs text-amber-700">
                            {t('ops_window.unscheduled_note', { count: unscheduledPendingTasks.length })}
                        </p>
                    )}

                    <TrackedEventLink
                        href={dashboardWindowAction.href}
                        eventName="dashboard_48h_window_action_clicked"
                        eventProperties={{ risk: dashboardRiskTone, overdue: overduePendingTasks.length }}
                        className="mt-3 inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
                    >
                        {dashboardWindowAction.label}
                    </TrackedEventLink>
                </section>

                <FirstWeekChecklist
                    items={checklistItems}
                    show={showFirstWeekChecklist}
                    hasDataIssue={hasDataFetchError}
                    retryHref={retryHref}
                    completionHref={checklistCompletionHref}
                />

                <div>
                    <div className="mb-4 flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">{t('active_projects')}</h2>
                            {!isVeteranMode && (
                                <p className="mt-1 text-sm text-gray-500">{t('modes.new_project_helper')}</p>
                            )}
                        </div>
                        <Link
                            href={`/${locale}/projects`}
                            className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800"
                        >
                            {t('view_all')}
                            <span className="material-symbols-outlined text-sm">arrow_forward</span>
                        </Link>
                    </div>

                    {projects.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-gray-300 bg-white py-12 text-center">
                            <p className="mb-4 text-gray-500">{t('no_projects')}</p>
                            <div className="flex flex-wrap items-center justify-center gap-3">
                                <Link
                                    href={`/${locale}/projects/create`}
                                    className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700"
                                >
                                    {t('create_new')}
                                </Link>
                                <TrackedEventLink
                                    href={emptyProjectsChatHref}
                                    eventName="dashboard_context_chat_clicked"
                                    eventProperties={{ surface: 'empty_projects' }}
                                    data-testid="dashboard-empty-projects-ai-link"
                                    className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-100"
                                >
                                    {t('empty_cta_ai')}
                                </TrackedEventLink>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {projects.slice(0, 6).map((project) => {
                                const opsSummary = projectOpsById.get(project.id);
                                const nextTaskDueLabel = opsSummary?.nextTask
                                    ? toDateLabel(opsSummary.nextTask.dueAt, locale, t('project_ops.date_unknown'))
                                    : t('project_ops.no_due_tasks');
                                const projectRiskTone: RiskTone = opsSummary?.risk || 'safe';

                                if (!isVeteranMode) {
                                    return (
                                        <Link key={project.id} href={`/${locale}/projects/${project.id}`} className="block h-full">
                                            <div className="flex h-full flex-col rounded-xl border border-gray-200 bg-white p-5 transition hover:border-green-200 hover:shadow-md">
                                                <div className="mb-3 flex items-start justify-between gap-2">
                                                    <h3 className="line-clamp-1 text-lg font-semibold text-gray-900">{project.name}</h3>
                                                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${project.status === 'active' ? 'bg-green-100 text-green-800'
                                                        : project.status === 'completed'
                                                            ? 'bg-blue-100 text-blue-800'
                                                            : 'bg-yellow-100 text-yellow-800'
                                                        }`}>
                                                        {project.status}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-600">
                                                    {project.crop} {project.variety ? `(${project.variety})` : ''}
                                                </p>
                                                <p className="mt-1 text-xs text-gray-500">
                                                    {t('project_ops.due_label', { date: nextTaskDueLabel })}
                                                </p>
                                                <p className="mt-3 text-sm font-medium text-slate-700">
                                                    {t('modes.new_project_next', {
                                                        task: opsSummary?.nextTask?.title || t('project_ops.no_pending_tasks'),
                                                    })}
                                                </p>
                                            </div>
                                        </Link>
                                    );
                                }

                                return (
                                    <Link key={project.id} href={`/${locale}/projects/${project.id}`} className="block group h-full">
                                        <div className="flex h-full flex-col rounded-xl border border-gray-200 bg-white p-5 transition hover:shadow-md group-hover:border-green-200">
                                            <div className="mb-3 flex items-start justify-between">
                                                <h3 className="line-clamp-1 text-lg font-semibold text-gray-900 transition group-hover:text-green-700">
                                                    {project.name}
                                                </h3>
                                                <span className={`rounded-full px-2 py-1 text-xs font-medium ${project.status === 'active' ? 'bg-green-100 text-green-800'
                                                    : project.status === 'completed'
                                                        ? 'bg-blue-100 text-blue-800'
                                                        : 'bg-yellow-100 text-yellow-800'
                                                    }`}>
                                                    {project.status}
                                                </span>
                                            </div>
                                            <div className="space-y-2 text-sm text-gray-600">
                                                <div className="flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-base text-gray-400">grass</span>
                                                    <span>{project.crop} {project.variety ? `(${project.variety})` : ''}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-base text-gray-400">calendar_today</span>
                                                    <span>{toDateLabel(project.startDate, locale, t('project_ops.date_unknown'))}</span>
                                                </div>
                                            </div>

                                            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
                                                <div className="mb-1 flex items-center justify-between gap-2">
                                                    <p className="text-xs font-semibold text-slate-600">{t('project_ops.next_operation')}</p>
                                                    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${riskBadgeClass(projectRiskTone)}`}>
                                                        {tw(`risk.${projectRiskTone}`)}
                                                    </span>
                                                </div>
                                                <p className="line-clamp-1 text-sm font-semibold text-slate-900">
                                                    {opsSummary?.nextTask?.title || t('project_ops.no_pending_tasks')}
                                                </p>
                                                <p className="mt-1 text-xs text-slate-600">
                                                    {t('project_ops.due_label', { date: nextTaskDueLabel })}
                                                </p>
                                                {opsSummary && (
                                                    <p className="mt-1 text-xs text-slate-500">
                                                        {t('project_ops.risk_counts', {
                                                            overdue: opsSummary.overdueCount,
                                                            dueIn48h: opsSummary.dueIn48hCount,
                                                            unscheduled: opsSummary.unscheduledCount,
                                                        })}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </div>

                {!isVeteranMode && (
                    <details className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <summary className="cursor-pointer list-none text-sm font-semibold text-slate-900">
                            {t('modes.new_advanced_disclosure')}
                        </summary>
                        <p className="mt-1 text-sm text-slate-600">{t('modes.new_advanced_helper')}</p>
                        <div className="mt-4 space-y-4">
                            {contextualBannerSections}
                        </div>
                    </details>
                )}
            </main>
        </div>
    );
}
