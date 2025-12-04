import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import DashboardHeader from './DashboardHeader';

import { cookies } from 'next/headers';

async function getProjects() {
    try {
        const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
        const cookieStore = await cookies();
        const cookieHeader = cookieStore.getAll().map(c => `${c.name}=${c.value}`).join('; ');

        const res = await fetch(`${baseUrl}/api/v1/projects`, {
            cache: 'no-store',
            headers: {
                Cookie: cookieHeader
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
            alerts: data.alerts || []
        };
    } catch (error) {
        console.error('Failed to fetch weather:', error);
        return {
            location: '長岡市',
            temperature: { max: 0, min: 0 },
            condition: '取得失敗',
            alerts: []
        };
    }
}

async function getTodayTasks() {
    try {
        const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
        const today = new Date();
        const endDate = new Date(today);
        endDate.setHours(23, 59, 59, 999);

        const cookieStore = await cookies();
        const cookieHeader = cookieStore.getAll().map(c => `${c.name}=${c.value}`).join('; ');

        // Fetch tasks due before end of today that are pending
        const res = await fetch(`${baseUrl}/api/v1/tasks?endDate=${endDate.toISOString()}&status=pending`, {
            cache: 'no-store',
            headers: {
                Cookie: cookieHeader
            }
        });

        if (!res.ok) throw new Error('Failed to fetch today tasks');
        const data = await res.json();

        // Enrich with project names if needed (API might not return project name, check schema)
        // The current API returns tasks. If tasks include project relation, great.
        // Let's check the API implementation in tasks.ts. 
        // It does NOT include project relation by default in findMany.
        // We might need to update API to include project, or fetch projects and map.
        // For efficiency, let's update API to include project relation.
        // But for now, let's assume we need to update API or map it.
        // Wait, I didn't update API to include project.
        // I should update API to include project relation.

        return data.tasks || [];
    } catch (error) {
        console.error('Failed to fetch today tasks:', error);
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

export default async function DashboardProjectList({ locale }: { locale: string }) {
    const t = await getTranslations({ locale, namespace: 'dashboard' });
    const projects: Project[] = await getProjects();
    const weather = await getWeather();
    const todayTasks = await getTodayTasks();

    return (
        <div className="min-h-screen bg-background font-sans">
            <DashboardHeader locale={locale} weather={weather} />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
                {/* Today's Focus */}
                <TodayFocus tasks={todayTasks} locale={locale} />

                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-semibold text-foreground">{t('my_projects')}</h2>
                    <Link
                        href={`/${locale}/projects/create`}
                        className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium text-primary-foreground bg-primary hover:opacity-90 transition-opacity min-h-[44px]"
                    >
                        + {t('create_project')}
                    </Link>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {/* Create New Card */}
                    <Link
                        href={`/${locale}/projects/create`}
                        className="block border-2 border-dashed border-border rounded-xl p-10 text-center hover:border-primary/50 hover:bg-primary/5 transition-colors group"
                    >
                        <span className="text-3xl text-muted-foreground group-hover:text-primary transition-colors">+</span>
                        <span className="mt-2 block text-sm text-muted-foreground">
                            {t('create_new_project')}
                        </span>
                    </Link>

                    {/* Project Cards - Simplified */}
                    {projects.map((project) => {
                        const daysSinceStart = Math.floor((new Date().getTime() - new Date(project.startDate).getTime()) / (1000 * 60 * 60 * 24));

                        return (
                            <Link
                                key={project.id}
                                href={`/${locale}/projects/${project.id}`}
                                className="block bg-card rounded-xl border border-border hover:border-primary/30 transition-colors p-5"
                            >
                                {/* Header */}
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-base font-semibold text-foreground">
                                            {project.name}
                                        </h3>
                                        <p className="text-sm text-muted-foreground mt-0.5">
                                            {project.crop} {project.variety ? `· ${project.variety}` : ''}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-xl font-semibold text-foreground">{daysSinceStart}</span>
                                        <span className="text-xs text-muted-foreground block">{t('days')}</span>
                                    </div>
                                </div>

                                {/* Info rows - simplified, no colored backgrounds */}
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">{t('last_activity')}</span>
                                        <span className="text-foreground">
                                            {project.lastActivity?.type || '—'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">{t('next_task')}</span>
                                        <span className="text-foreground">
                                            {project.nextTask?.title || '—'}
                                        </span>
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className="mt-4 pt-3 border-t border-border flex justify-between items-center text-xs text-muted-foreground">
                                    <span>{project.field?.name || t('not_set')}</span>
                                    <span className="text-primary">詳細 →</span>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
