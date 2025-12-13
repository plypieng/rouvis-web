'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';

import { use } from 'react';

type Project = {
    id: string;
    name: string;
    crop?: string | null;
    variety?: string | null;
    startDate?: string | null;
    status?: string | null;
};

export default function ProjectsPage(props: { params: Promise<{ locale: string }> }) {
    const params = use(props.params);
    const { locale } = params;
    const t = useTranslations('projects');
    const [projects, setProjects] = useState<Project[]>([]);
    const [showArchived, setShowArchived] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchProjects();
    }, []);

    const fetchProjects = async () => {
        try {
            const res = await fetch('/api/v1/projects', { cache: 'no-store' });
            if (!res.ok) {
                console.error('Failed to fetch projects:', res.status, res.statusText);
                setProjects([]);
                return;
            }
            const data = await res.json();
            setProjects(data.projects || []);
        } catch (error) {
            console.error('Error fetching projects:', error);
            setProjects([]);
        } finally {
            setLoading(false);
        }
    };

    const handleUnarchive = async (projectId: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        try {
            const res = await fetch(`/api/v1/projects/${projectId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'active' }),
            });
            if (!res.ok) throw new Error('Unarchive failed');

            // Refresh projects list
            fetchProjects();
            alert(t('unarchived_success', { name: projects.find(p => p.id === projectId)?.name }));
        } catch (error) {
            console.error('Unarchive error:', error);
            alert('復元に失敗しました');
        }
    };

    // Filter projects based on showArchived toggle
    const activeProjects = projects.filter(p => p.status !== 'archived');
    const archivedProjects = projects.filter(p => p.status === 'archived');
    const displayProjects = showArchived ? [...activeProjects, ...archivedProjects] : activeProjects;

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-8 max-w-5xl">
                <div className="text-center py-12">
                    <p className="text-gray-500">読み込み中...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-5xl">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900">{t('list_title')}</h1>
                <div className="flex items-center gap-3">
                    {/* Archive Toggle */}
                    {archivedProjects.length > 0 && (
                        <button
                            onClick={() => setShowArchived(!showArchived)}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${showArchived
                                ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            <span className="material-symbols-outlined text-base">
                                {showArchived ? 'visibility_off' : 'visibility'}
                            </span>
                            {showArchived ? t('hide_archived') : t('show_archived')}
                        </button>
                    )}

                    <Link
                        href={`/${locale}/projects/create`}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition shadow-sm flex items-center gap-2"
                    >
                        <span className="material-symbols-outlined text-sm">add</span>
                        {t('create_new')}
                    </Link>
                </div>
            </div>

            {displayProjects.length === 0 ? (
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
                    {displayProjects.map((project) => {
                        const isArchived = project.status === 'archived';
                        return (
                            <div key={project.id} className="relative">
                                <Link href={`/${locale}/projects/${project.id}`} className="block group">
                                    <div className={`border rounded-xl p-5 hover:shadow-md transition bg-white h-full flex flex-col border-gray-200 group-hover:border-green-200 ${isArchived ? 'opacity-60' : ''
                                        }`}>
                                        <div className="flex justify-between items-start mb-3">
                                            <h2 className="text-lg font-semibold text-gray-900 group-hover:text-green-700 transition">
                                                {project.name}
                                            </h2>
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${isArchived ? 'bg-gray-200 text-gray-700' :
                                                project.status === 'active' ? 'bg-green-100 text-green-800' :
                                                    project.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                                                        'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                {isArchived ? t('archived_badge') : project.status}
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

                                {/* Unarchive Button for Archived Projects */}
                                {isArchived && (
                                    <button
                                        onClick={(e) => handleUnarchive(project.id, e)}
                                        className="absolute top-3 right-3 z-10 p-2 bg-white rounded-lg shadow-sm border border-gray-200 hover:bg-blue-50 hover:border-blue-300 transition flex items-center gap-1 text-xs font-medium text-blue-600"
                                    >
                                        <span className="material-symbols-outlined text-base">unarchive</span>
                                        {t('unarchive')}
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
