import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import DashboardHeader from './DashboardHeader';
import { ModuleBlueprint } from '@/components/workflow/ModuleBlueprint';

import { cookies } from 'next/headers';

async function getProjects() {
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

        if (!res.ok) throw new Error('Failed to fetch projects');
        const data = await res.json();
        return data.projects || [];
    } catch (error) {
        console.error('Failed to fetch projects:', error);
        return [];
    }
}

async function getWeather() {
    try {
        const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
        const res = await fetch(`${baseUrl}/api/v1/weather/forecast?lat=37.4&lon=138.9`, {
            next: { revalidate: 3600 }, // Cache for 1 hour
        });

        if (!res.ok) throw new Error('Failed to fetch weather');
        const data = await res.json();

        // Transform API response to match DashboardHeader expectation
        const today = data.forecast?.[0];
        return {
            location: data.location || '長岡市',
            temperature: {
                max: today?.temperature?.max ?? 0,
                min: today?.temperature?.min ?? 0
            },
            condition: data.condition || '不明',
            alerts: data.alerts || [],
            forecast: data.forecast || [] // Pass daily forecast
        };
    } catch (error) {
        console.error('Failed to fetch weather:', error);
        return {
            location: '長岡市',
            temperature: { max: 0, min: 0 },
            condition: '取得失敗',
            alerts: [],
            forecast: []
        };
    }
}

async function getDashboardTasks() {
    try {
        const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';

        // Fetch tasks for current month +/- 1 week to cover calendar view
        const today = new Date();
        const startDate = new Date(today.getFullYear(), today.getMonth(), 1); // Start of month
        startDate.setDate(startDate.getDate() - 7); // Buffer

        const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0); // End of month
        endDate.setDate(endDate.getDate() + 7); // Buffer

        const cookieStore = await cookies();
        const cookieHeader = cookieStore.getAll().map(c => `${c.name}=${c.value}`).join('; ');

        const res = await fetch(`${baseUrl}/api/v1/tasks?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}&status=pending`, {
            cache: 'no-store',
            headers: {
                ...(cookieHeader ? { Cookie: cookieHeader } : {}),
            }
        });

        if (!res.ok) throw new Error('Failed to fetch dashboard tasks');
        const data = await res.json();
        return data.tasks || [];
    } catch (error) {
        console.error('Failed to fetch dashboard tasks:', error);
        return [];
    }
}

interface Project {
    id: string;
    name: string;
    crop: string;
    variety?: string;
    startDate: string;
    status: string;
    field?: {
        name: string;
    };
    lastActivity?: {
        type: string;
        date: string;
    };
    nextTask?: {
        title: string;
        dueDate: string;
    };
}

import TodayFocus from './TodayFocus';

// ... (existing imports)

export default async function DashboardProjectList({ locale, userId: _userId }: { locale: string; userId: string }) {
    const t = await getTranslations({ locale, namespace: 'dashboard' });
    const projects: Project[] = await getProjects();
    const weather = await getWeather();
    const dashboardTasks = await getDashboardTasks(); // All pending tasks for view

    // Filter for "Today's Focus" list (Today and Overdue)
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const todayTasks = dashboardTasks.filter((t: any) => new Date(t.dueAt) <= today);

    const statusLabel = (status: string) => {
        if (status === 'active') return locale === 'ja' ? '進行中' : 'Active';
        if (status === 'completed') return locale === 'ja' ? '完了' : 'Completed';
        return locale === 'ja' ? '要確認' : 'Review';
    };

    const statusClassName = (status: string) => {
        if (status === 'active') return 'status-safe';
        if (status === 'completed') return 'status-watch';
        return 'status-warning';
    };

    return (
        <div className="min-h-screen shell-canvas font-sans">
            <DashboardHeader locale={locale} weather={weather} tasks={dashboardTasks} />

            <main className="shell-main pb-10 space-y-8">
                {/* Today's Focus Section */}
                {todayTasks.length > 0 && (
                    <TodayFocus tasks={todayTasks} locale={locale} />
                )}

                {/* Projects Grid */}
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold text-foreground">{t('active_projects')}</h2>
                        <Link
                            href={`/${locale}/projects`}
                            className="inline-flex items-center gap-1 text-sm font-semibold text-brand-seedling hover:text-brand-seedling/80"
                        >
                            {t('view_all')}
                            <span className="material-symbols-outlined text-sm">arrow_forward</span>
                        </Link>
                    </div>

                    {projects.length === 0 ? (
                        <div className="mx-auto max-w-xl space-y-4">
                            <ModuleBlueprint
                                title={t('empty_title')}
                                description={t('empty_subtitle')}
                                tone="watch"
                                icon={<span className="text-2xl" aria-hidden="true">+</span>}
                                action={(
                                    <Link
                                        href={`/${locale}/projects/create`}
                                        className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
                                    >
                                        <span className="material-symbols-outlined text-base">add</span>
                                        {t('create_first_project')}
                                    </Link>
                                )}
                            />
                            <div className="surface-base p-4">
                                <ol className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-center gap-2"><span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground">1</span>{t('empty_step_1')}</li>
                                    <li className="flex items-center gap-2"><span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground">2</span>{t('empty_step_2')}</li>
                                    <li className="flex items-center gap-2"><span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground">3</span>{t('empty_step_3')}</li>
                                </ol>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {projects.slice(0, 6).map((project) => (
                                <Link key={project.id} href={`/${locale}/projects/${project.id}`} className="group block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                                    <article className="surface-base h-full p-5 transition-colors group-hover:border-brand-seedling/45 group-hover:bg-secondary/40">
                                        <div className="mb-3 flex items-start justify-between gap-2">
                                            <h3 className="line-clamp-1 text-lg font-semibold text-foreground group-hover:text-brand-seedling">
                                                {project.name}
                                            </h3>
                                            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClassName(project.status)}`}>
                                                {statusLabel(project.status)}
                                            </span>
                                        </div>
                                        <div className="space-y-2 text-sm text-muted-foreground">
                                            <div className="flex items-center gap-2">
                                                <span className="material-symbols-outlined text-base text-foreground/70">grass</span>
                                                <span>{project.crop} {project.variety && `(${project.variety})`}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="material-symbols-outlined text-base text-foreground/70">calendar_today</span>
                                                <span>{new Date(project.startDate).toLocaleDateString(locale)}</span>
                                            </div>
                                        </div>
                                    </article>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
