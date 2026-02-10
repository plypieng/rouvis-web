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

    return (
        <div className="min-h-screen bg-background font-sans">
            <DashboardHeader locale={locale} weather={weather} tasks={dashboardTasks} />

            <main className="container mx-auto px-4 py-8 max-w-7xl space-y-8">
                {/* Today's Focus Section */}
                {todayTasks.length > 0 && (
                    <TodayFocus tasks={todayTasks} locale={locale} />
                )}

                {/* Projects Grid */}
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
                            <Link
                                href={`/${locale}/projects/create`}
                                className="text-green-600 hover:underline font-medium"
                            >
                                {t('create_new')}
                            </Link>
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
