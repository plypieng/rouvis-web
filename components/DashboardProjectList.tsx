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
    tasks?: Array<{
        id: string;
        title: string;
        status: string;
        dueDate: string;
    }>;
    activities?: Array<{
        id: string;
    }>;
}

type DashboardTask = {
    id: string;
    title: string;
    dueAt: string;
    status: string;
    projectId?: string;
    projectName?: string;
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

type LoadResult<T> = {
    data: T;
    hasError: boolean;
};

async function getProjects(): Promise<LoadResult<Project[]>> {
    try {
        const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
        const cookieStore = await cookies();
        const cookieHeader = cookieStore.getAll().map(c => `${c.name}=${c.value}`).join('; ');

        const res = await fetch(`${baseUrl}/api/v1/projects`, {
            cache: 'no-store',
            headers: {
                ...(cookieHeader ? { Cookie: cookieHeader } : {}),
            }
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

async function getWeather(): Promise<LoadResult<WeatherData>> {
    try {
        const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
        const res = await fetch(`${baseUrl}/api/v1/weather/forecast?lat=37.4&lon=138.9`, {
            next: { revalidate: 3600 },
        });

        if (!res.ok) throw new Error(`Failed to fetch weather (${res.status})`);
        const data = await res.json();

        const today = data.forecast?.[0];
        return {
            data: {
                location: data.location || '長岡市',
                temperature: {
                    max: today?.temperature?.max ?? 0,
                    min: today?.temperature?.min ?? 0
                },
                condition: data.condition || '不明',
                alerts: data.alerts || [],
                forecast: data.forecast || []
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
                forecast: []
            },
            hasError: true,
        };
    }
}

async function getDashboardTasks(): Promise<LoadResult<DashboardTask[]>> {
    try {
        const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';

        const today = new Date();
        const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        startDate.setDate(startDate.getDate() - 7);

        const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        endDate.setDate(endDate.getDate() + 7);

        const cookieStore = await cookies();
        const cookieHeader = cookieStore.getAll().map(c => `${c.name}=${c.value}`).join('; ');

        const res = await fetch(`${baseUrl}/api/v1/tasks?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}&status=pending`, {
            cache: 'no-store',
            headers: {
                ...(cookieHeader ? { Cookie: cookieHeader } : {}),
            }
        });

        if (!res.ok) throw new Error(`Failed to fetch dashboard tasks (${res.status})`);
        const data = await res.json();
        return {
            data: (data.tasks || []) as DashboardTask[],
            hasError: false,
        };
    } catch (error) {
        console.error('Failed to fetch dashboard tasks:', error);
        return {
            data: [],
            hasError: true,
        };
    }
}

async function getProfile(): Promise<LoadResult<UserProfile | null>> {
    try {
        const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
        const cookieStore = await cookies();
        const cookieHeader = cookieStore.getAll().map(c => `${c.name}=${c.value}`).join('; ');

        const res = await fetch(`${baseUrl}/api/v1/profile`, {
            cache: 'no-store',
            headers: {
                ...(cookieHeader ? { Cookie: cookieHeader } : {}),
            }
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
    userId: _userId,
    forceDataError = false,
}: {
    locale: string;
    userId: string;
    forceDataError?: boolean;
}) {
    const t = await getTranslations({ locale, namespace: 'dashboard' });
    const [projectsResult, weatherResult, dashboardTasksResult, profileResult] = await Promise.all([
        getProjects(),
        getWeather(),
        getDashboardTasks(),
        getProfile(),
    ]);
    const projects = projectsResult.data;
    const weather = weatherResult.data;
    const dashboardTasks = dashboardTasksResult.data;
    const profile = profileResult.data;
    const hasDataFetchError = forceDataError || projectsResult.hasError || weatherResult.hasError || dashboardTasksResult.hasError || profileResult.hasError;
    const retryHref = `/${locale}?retry=${Date.now().toString()}`;
    const emptyProjectsChatHref = `/${locale}/chat?${new URLSearchParams({
        intent: 'project',
        prompt: 'まだプロジェクトがありません。最初のプロジェクト候補と今日やることを提案して',
        fresh: '1',
    }).toString()}`;

    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const todayTasks = dashboardTasks.filter((task) => new Date(task.dueAt) <= today);
    const todayFocusTasks = todayTasks.map((task) => ({
        id: task.id,
        title: task.title,
        dueDate: task.dueAt,
        status: task.status,
        priority: 'medium',
        projectId: task.projectId,
        project: task.projectName ? { name: task.projectName } : undefined,
    }));
    const quickTask = todayTasks.length > 0
        ? {
            id: todayTasks[0].id,
            title: todayTasks[0].title,
            projectName: todayTasks[0].projectName,
        }
        : null;

    const allProjectTasks = projects.flatMap((project) => project.tasks || []);
    const completedTaskExists = allProjectTasks.some((task) => task.status === 'completed');
    const activitiesCount = projects.reduce((count, project) => count + (project.activities?.length || 0), 0);
    const hasGeneratedSchedule = projects.some((project) => (project.tasks?.length || 0) > 0);

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

    const showFirstWeekChecklist = checklistItems.some((item) => !item.done) && (withinFirstWeek || projects.length <= 1);

    return (
        <div className="min-h-screen bg-background font-sans">
            <DashboardHeader locale={locale} weather={weather} tasks={dashboardTasks} />

            <main className="container mx-auto px-4 py-8 max-w-7xl space-y-8">
                <TodayControlCenter locale={locale} quickTask={quickTask} />

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

                <FirstWeekChecklist items={checklistItems} show={showFirstWeekChecklist} />

                {todayFocusTasks.length > 0 && (
                    <TodayFocus tasks={todayFocusTasks} locale={locale} />
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
                            {projects.slice(0, 6).map((project) => (
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
                                        <div className="space-y-2 text-sm text-gray-600 flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="material-symbols-outlined text-gray-400 text-base">grass</span>
                                                <span>{project.crop} {project.variety && `(${project.variety})`}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="material-symbols-outlined text-gray-400 text-base">calendar_today</span>
                                                <span>{new Date(project.startDate).toLocaleDateString(locale)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
