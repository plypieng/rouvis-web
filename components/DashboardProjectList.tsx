import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { cookies } from 'next/headers';

import DashboardHeader from './DashboardHeader';
import TodayFocus from './TodayFocus';
import TodayControlCenter from './TodayControlCenter';
import FirstWeekChecklist, { type ChecklistItem } from './FirstWeekChecklist';
import TrackedEventLink from './TrackedEventLink';

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
};

type UserProfile = {
    createdAt?: string;
};

type WeatherData = {
    location: string;
    temperature: { max: number; min: number };
    condition: string;
    alerts: string[];
    forecast: unknown[];
};

type ActivationContext = {
    enabled?: boolean;
    projectId?: string;
    taskId?: string;
};

type RiskTone = 'safe' | 'watch' | 'warning' | 'critical';

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

function buildTodayChatHref(locale: string): string {
    const query = new URLSearchParams({
        intent: 'today',
        prompt: '今日やるべき作業を優先順位つきで3つに整理して',
        fresh: '1',
    });
    return `/${locale}/chat?${query.toString()}`;
}

function withCookieHeaders(cookieHeader: string): HeadersInit | undefined {
    if (!cookieHeader) return undefined;
    return { Cookie: cookieHeader };
}

async function getProjects(cookieHeader: string): Promise<LoadResult<Project[]>> {
    try {
        const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
        const res = await fetch(`${baseUrl}/api/v1/projects`, {
            cache: 'no-store',
            headers: withCookieHeaders(cookieHeader),
        });

        if (!res.ok) throw new Error(`Failed to fetch projects (${res.status})`);
        const data = await res.json();
        return {
            data: (data.projects || []) as Project[],
            hasError: false,
        };
    } catch (error) {
        console.error('Failed to fetch projects:', error);
        return {
            data: [],
            hasError: true,
        };
    }
}

async function getWeather(cookieHeader: string): Promise<LoadResult<WeatherData>> {
    try {
        const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
        const res = await fetch(`${baseUrl}/api/v1/weather/overview`, {
            next: { revalidate: 3600 },
            headers: withCookieHeaders(cookieHeader),
        });

        if (!res.ok) throw new Error(`Failed to fetch weather (${res.status})`);
        const data = await res.json();

        const daily = Array.isArray(data.daily) ? data.daily : [];
        const today = daily[0];
        const mappedForecast = daily.map((day: any) => ({
            date: day.date,
            temperature: day.temperature,
            condition: day?.condition?.label || day.condition || '不明',
            icon: day?.condition?.icon || day.icon || '03d',
            precipitation: day?.precipitationMm ?? day.precipitation ?? 0,
        }));

        return {
            data: {
                location: data?.location?.label || data.location || '長岡市',
                temperature: {
                    max: today?.temperature?.max ?? 0,
                    min: today?.temperature?.min ?? 0,
                },
                condition: data?.current?.condition?.label || data.condition || '不明',
                alerts: Array.isArray(data.alerts) ? data.alerts.map((alert: any) => alert.title) : [],
                forecast: mappedForecast,
            },
            hasError: false,
        };
    } catch (error) {
        console.error('Failed to fetch weather:', error);
        return {
            data: {
                location: '長岡市',
                temperature: { max: 0, min: 0 },
                condition: '取得失敗',
                alerts: [],
                forecast: [],
            },
            hasError: true,
        };
    }
}

async function getTasks(cookieHeader: string): Promise<LoadResult<DashboardTask[]>> {
    try {
        const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
        const res = await fetch(`${baseUrl}/api/v1/tasks`, {
            cache: 'no-store',
            headers: withCookieHeaders(cookieHeader),
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

async function getActivities(cookieHeader: string): Promise<LoadResult<DashboardActivity[]>> {
    try {
        const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
        const res = await fetch(`${baseUrl}/api/v1/activities`, {
            cache: 'no-store',
            headers: withCookieHeaders(cookieHeader),
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

async function getProfile(cookieHeader: string): Promise<LoadResult<UserProfile | null>> {
    try {
        const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
        const res = await fetch(`${baseUrl}/api/v1/profile`, {
            cache: 'no-store',
            headers: withCookieHeaders(cookieHeader),
        });

        if (res.status === 404) {
            return {
                data: null,
                hasError: false,
            };
        }

        if (!res.ok) {
            throw new Error(`Failed to fetch profile (${res.status})`);
        }

        const data = await res.json();
        return {
            data: (data?.profile || null) as UserProfile | null,
            hasError: false,
        };
    } catch (error) {
        console.error('Failed to fetch profile:', error);
        return {
            data: null,
            hasError: true,
        };
    }
}

export default async function DashboardProjectList({
    locale,
    forceDataError = false,
    activationContext,
}: {
    locale: string;
    forceDataError?: boolean;
    activationContext?: ActivationContext;
}) {
    const [t, tw] = await Promise.all([
        getTranslations({ locale, namespace: 'dashboard' }),
        getTranslations({ locale, namespace: 'workflow' }),
    ]);
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.getAll().map((cookie) => `${cookie.name}=${cookie.value}`).join('; ');

    const [projectsResult, weatherResult, tasksResult, activitiesResult, profileResult] = await Promise.all([
        getProjects(cookieHeader),
        getWeather(cookieHeader),
        getTasks(cookieHeader),
        getActivities(cookieHeader),
        getProfile(cookieHeader),
    ]);

    const projects = projectsResult.data;
    const weather = weatherResult.data;
    const allTasks = tasksResult.data;
    const activities = activitiesResult.data;
    const profile = profileResult.data;
    const hasDataFetchError = forceDataError
        || projectsResult.hasError
        || weatherResult.hasError
        || tasksResult.hasError
        || activitiesResult.hasError
        || profileResult.hasError;

    const retryHref = `/${locale}?retry=${Date.now().toString()}`;
    const emptyProjectsChatHref = `/${locale}/chat?${new URLSearchParams({
        intent: 'project',
        prompt: 'まだプロジェクトがありません。最初のプロジェクト候補と今日やることを提案して',
        fresh: '1',
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

    const focusTaskId = activationTask && dueTodayOrOverduePendingTasks.some((task) => task.id === activationTask.id)
        ? activationTask.id
        : null;
    const quickTaskSource = activationTask || dueTodayOrOverduePendingTasks[0] || null;

    const todayFocusTasks = dueTodayOrOverduePendingTasks.map((task) => ({
        id: task.id,
        title: task.title,
        dueDate: task.dueAt,
        status: task.status,
        priority: 'medium',
        projectId: task.projectId,
        project: task.projectName ? { name: task.projectName } : undefined,
    }));

    const quickTask = quickTaskSource
        ? {
            id: quickTaskSource.id,
            title: quickTaskSource.title,
            projectName: quickTaskSource.projectName,
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
            label: '初期設定を完了',
            done: Boolean(profile),
            href: `/${locale}/onboarding`,
        },
        {
            id: 'project',
            label: '最初のプロジェクトを作成',
            done: projects.length > 0,
            href: `/${locale}/projects/create`,
        },
        {
            id: 'schedule',
            label: '初回タスクを生成',
            done: hasGeneratedSchedule,
            href: `/${locale}/projects/create`,
        },
        {
            id: 'task_complete',
            label: 'タスクを1件完了',
            done: completedTaskExists,
            href: `/${locale}/calendar`,
        },
        {
            id: 'activity',
            label: '活動記録を1件残す',
            done: activitiesCount > 0,
            href: `/${locale}/records?action=log`,
        },
    ];

    const firstIncompleteChecklist = checklistItems.find((item) => !item.done) || null;
    const showFirstWeekChecklist = Boolean(firstIncompleteChecklist) && (withinFirstWeek || projects.length <= 1);
    const showResumeSetupBanner = Boolean(profile) && Boolean(firstIncompleteChecklist) && !activationContext?.enabled;

    const todayProgressTotal = todayTasks.length;
    const todayProgressDone = todayCompletedTasks.length;
    const todayProgressPercent = todayProgressTotal === 0
        ? 0
        : Math.round((todayProgressDone / todayProgressTotal) * 100);

    const dailyLoopAction = dueTodayOrOverduePendingTasks.length > 0
        ? {
            label: `残り${dueTodayOrOverduePendingTasks.length}件を進める`,
            href: `/${locale}/calendar`,
            eventName: 'daily_loop_focus_clicked',
            className: 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100',
            helper: '期限が近い作業から順に片付けるのが最短です。',
        }
        : todayProgressDone > 0
            ? {
                label: '今日の活動を記録して締める',
                href: `/${locale}/records?action=log`,
                eventName: 'daily_loop_log_clicked',
                className: 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
                helper: '終わった作業を記録すると次回の提案精度が上がります。',
            }
            : {
                label: 'AIに今日の段取りを相談',
                href: buildTodayChatHref(locale),
                eventName: 'daily_loop_ai_clicked',
                className: 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100',
                helper: 'まだ着手前なら、最初の3手をAIに整理してもらいましょう。',
            };

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
                href: buildTodayChatHref(locale),
                label: t('ops_window.action_plan'),
            };

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

    return (
        <div className="min-h-screen bg-background font-sans">
            <DashboardHeader locale={locale} weather={weather} tasks={pendingTasks} />

            <main className="container mx-auto px-4 py-8 max-w-7xl space-y-8">
                {activationContext?.enabled && (
                    <section
                        data-testid="dashboard-activation-banner"
                        className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-emerald-900"
                    >
                        <p className="text-sm font-semibold">初回セットアップが完了しました。</p>
                        <p className="mt-1 text-sm">
                            {activationTask
                                ? `次の1件: 「${activationTask.title}」${activationTask.projectName ? `（${activationTask.projectName}）` : ''}`
                                : activationProject
                                    ? `「${activationProject.name}」の最初の作業に進みましょう。`
                                    : '最初の作業に進みましょう。'}
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
                            最初のタスクを開く
                            <span className="material-symbols-outlined text-sm">arrow_forward</span>
                        </TrackedEventLink>
                    </section>
                )}

                {showResumeSetupBanner && firstIncompleteChecklist && (
                    <section className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-4 text-blue-900">
                        <p className="text-sm font-semibold">セットアップが未完了です。</p>
                        <p className="mt-1 text-sm">次は「{firstIncompleteChecklist.label}」を進めると利用が安定します。</p>
                        <TrackedEventLink
                            href={firstIncompleteChecklist.href}
                            eventName="resume_setup_clicked"
                            eventProperties={{ step: firstIncompleteChecklist.id }}
                            className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-blue-800 hover:text-blue-950 hover:underline"
                        >
                            続きから再開
                            <span className="material-symbols-outlined text-sm">arrow_forward</span>
                        </TrackedEventLink>
                    </section>
                )}

                <TodayControlCenter
                    locale={locale}
                    quickTask={quickTask}
                    hasCompletedTaskInitially={completedTaskExists}
                />

                {hasDataFetchError && (
                    <div data-testid="dashboard-data-warning" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                        <p className="font-semibold">一部データを取得できませんでした。</p>
                        <p className="mt-1">表示が最新でない可能性があります。再試行してください。</p>
                        <TrackedEventLink
                            href={retryHref}
                            eventName="dashboard_retry_clicked"
                            eventProperties={{ surface: 'dashboard_warning' }}
                            data-testid="dashboard-retry-link"
                            className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-amber-800 hover:text-amber-950 hover:underline"
                        >
                            再試行
                            <span className="material-symbols-outlined text-sm">refresh</span>
                        </TrackedEventLink>
                    </div>
                )}

                <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="mb-3 flex items-center justify-between gap-3">
                        <h2 className="text-base font-bold text-slate-900">Daily Loop</h2>
                        <span className="text-xs text-slate-500">
                            今日の進捗 {todayProgressDone}/{todayProgressTotal || 0}
                        </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                            className="h-full rounded-full bg-emerald-500 transition-all"
                            style={{ width: `${todayProgressPercent}%` }}
                        />
                    </div>
                    <p className="mt-3 text-sm text-slate-700">{dailyLoopAction.helper}</p>
                    <TrackedEventLink
                        href={dailyLoopAction.href}
                        eventName={dailyLoopAction.eventName}
                        className={`mt-3 inline-flex min-h-[44px] items-center justify-center rounded-xl border px-3 py-2 text-sm font-semibold transition ${dailyLoopAction.className}`}
                    >
                        {dailyLoopAction.label}
                    </TrackedEventLink>
                </section>

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

                <FirstWeekChecklist items={checklistItems} show={showFirstWeekChecklist} />

                {todayFocusTasks.length > 0 && (
                    <TodayFocus
                        tasks={todayFocusTasks}
                        locale={locale}
                        highlightTaskId={focusTaskId}
                        hasCompletedTaskInitially={completedTaskExists}
                    />
                )}

                <div>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-gray-900">{t('active_projects')}</h2>
                        <Link
                            href={`/${locale}/projects`}
                            className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1"
                        >
                            {t('view_all')}
                            <span className="material-symbols-outlined text-sm">arrow_forward</span>
                        </Link>
                    </div>

                    {projects.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-lg border border-dashed border-gray-300">
                            <p className="text-gray-500 mb-4">{t('no_projects')}</p>
                            <div className="flex flex-wrap items-center justify-center gap-3">
                                <Link
                                    href={`/${locale}/projects/create`}
                                    className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700"
                                >
                                    {t('create_new')}
                                </Link>
                                <Link
                                    href={emptyProjectsChatHref}
                                    data-testid="dashboard-empty-projects-ai-link"
                                    className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-100"
                                >
                                    AIに相談
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {projects.slice(0, 6).map((project) => {
                                const opsSummary = projectOpsById.get(project.id);
                                const nextTaskDueLabel = opsSummary?.nextTask
                                    ? toDateLabel(opsSummary.nextTask.dueAt, locale, t('project_ops.date_unknown'))
                                    : t('project_ops.no_due_tasks');
                                const projectRiskTone: RiskTone = opsSummary?.risk || 'safe';

                                return (
                                    <Link key={project.id} href={`/${locale}/projects/${project.id}`} className="block group h-full">
                                        <div className="border rounded-xl p-5 hover:shadow-md transition bg-white h-full flex flex-col border-gray-200 group-hover:border-green-200">
                                            <div className="flex justify-between items-start mb-3">
                                                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-green-700 transition line-clamp-1">
                                                    {project.name}
                                                </h3>
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${project.status === 'active' ? 'bg-green-100 text-green-800' :
                                                    project.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                                                        'bg-yellow-100 text-yellow-800'
                                                    }`}>
                                                    {project.status}
                                                </span>
                                            </div>
                                            <div className="space-y-2 text-sm text-gray-600">
                                                <div className="flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-gray-400 text-base">grass</span>
                                                    <span>{project.crop} {project.variety && `(${project.variety})`}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-gray-400 text-base">calendar_today</span>
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
            </main>
        </div>
    );
}
