'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { toastError, toastSuccess, toastWarning } from '@/lib/feedback';

import { use } from 'react';

type Project = {
    id: string;
    name: string;
    crop?: string | null;
    variety?: string | null;
    startDate?: string | null;
    status?: string | null;
};

type NoticeState = {
    type: 'success' | 'error' | 'warning';
    message: string;
    actionLabel?: string;
    onAction?: () => void;
} | null;

export default function ProjectsPage(props: { params: Promise<{ locale: string }> }) {
    const params = use(props.params);
    const { locale } = params;
    const t = useTranslations('projects');
    const [projects, setProjects] = useState<Project[]>([]);
    const [showArchived, setShowArchived] = useState(false);
    const [loading, setLoading] = useState(true);
    const [notice, setNotice] = useState<NoticeState>(null);

    const fetchProjects = useCallback(async () => {
        setNotice(null);
        try {
            const res = await fetch('/api/v1/projects', { cache: 'no-store' });
            if (!res.ok) {
                const payload = await res.json().catch(() => ({}));
                const message = payload?.error || 'プロジェクト一覧の取得に失敗しました';
                console.error('Failed to fetch projects:', res.status, res.statusText, message);
                setProjects([]);
                setNotice({
                    type: 'error',
                    message,
                    actionLabel: '再試行',
                    onAction: () => {
                        void fetchProjects();
                    },
                });
                toastError(message, {
                    label: '再試行',
                    onClick: () => {
                        void fetchProjects();
                    },
                });
                return;
            }
            const data = await res.json();
            setProjects(data.projects || []);
        } catch (error) {
            console.error('Error fetching projects:', error);
            setProjects([]);
            const message = 'プロジェクト一覧の取得に失敗しました';
            setNotice({
                type: 'error',
                message,
                actionLabel: '再試行',
                onAction: () => {
                    void fetchProjects();
                },
            });
            toastError(message, {
                label: '再試行',
                onClick: () => {
                    void fetchProjects();
                },
            });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void fetchProjects();
    }, [fetchProjects]);

    useEffect(() => {
        if (!notice) return;
        const timeout = setTimeout(() => setNotice(null), 4000);
        return () => clearTimeout(timeout);
    }, [notice]);

    const handleUnarchive = async (projectId: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setNotice(null);

        try {
            const res = await fetch(`/api/v1/projects/${projectId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'active' }),
            });
            if (!res.ok) throw new Error('Unarchive failed');

            // Refresh projects list
            fetchProjects();
            setNotice({
                type: 'success',
                message: t('unarchived_success', { name: projects.find(p => p.id === projectId)?.name || '' }),
            });
        } catch (error) {
            console.error('Unarchive error:', error);
            setNotice({
                type: 'error',
                message: '復元に失敗しました',
            });
        }
    };

    const handleDeleteConfirmed = async (project: Project) => {
        setNotice(null);

        try {
            const res = await fetch(`/api/v1/projects/${project.id}`, {
                method: 'DELETE',
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || 'Delete failed');
            }

            // Refresh projects list
            fetchProjects();
            const successNotice: NoticeState = {
                type: 'success',
                message: t('delete_success'),
            };
            setNotice(successNotice);
            toastSuccess(successNotice.message);
        } catch (error) {
            console.error('Delete error:', error);

            // Show detailed error if available
            const errorMessage = error instanceof Error ? error.message : t('delete_error');
            const message = errorMessage.startsWith('Failed') ? errorMessage : t('delete_error');
            const errorNotice: NoticeState = {
                type: 'error',
                message,
                actionLabel: '再試行',
                onAction: () => {
                    void handleDeleteConfirmed(project);
                },
            };
            setNotice(errorNotice);
            toastError(message, {
                label: '再試行',
                onClick: () => {
                    void handleDeleteConfirmed(project);
                },
            });
        }
    };

    const handleDelete = async (project: Project, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const message = t('delete_confirm_message', { name: project.name });
        setNotice({
            type: 'warning',
            message,
            actionLabel: '削除する',
            onAction: () => {
                void handleDeleteConfirmed(project);
            },
        });
        toastWarning(message, {
            label: '削除する',
            onClick: () => {
                void handleDeleteConfirmed(project);
            },
        });
    };

    // Filter projects based on showArchived toggle
    const activeProjects = projects.filter(p => p.status !== 'archived');
    const archivedProjects = projects.filter(p => p.status === 'archived');
    const displayProjects = showArchived ? [...activeProjects, ...archivedProjects] : activeProjects;
    const emptyProjectsChatHref = `/${locale}/chat?${new URLSearchParams({
        intent: 'project',
        prompt: 'まだプロジェクトがありません。最初のプロジェクト候補と今日の一歩を提案して',
        fresh: '1',
    }).toString()}`;

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
            {notice && (
                <div
                    className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
                        notice.type === 'success'
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : notice.type === 'warning'
                                ? 'border-amber-200 bg-amber-50 text-amber-700'
                                : 'border-red-200 bg-red-50 text-red-700'
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
                    <div className="flex flex-wrap items-center justify-center gap-3">
                        <Link
                            href={`/${locale}/projects/create`}
                            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700"
                        >
                            {t('create_new')}
                        </Link>
                        <Link
                            href={emptyProjectsChatHref}
                            data-testid="projects-empty-ai-link"
                            className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-100"
                        >
                            AIに相談
                        </Link>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {displayProjects.map((project) => {
                        const isArchived = project.status === 'archived';
                        const projectChatHref = `/${locale}/chat?${new URLSearchParams({
                            intent: 'project',
                            projectId: project.id,
                            prompt: `${project.name}の今週の優先作業を整理して`,
                            fresh: '1',
                        }).toString()}`;
                        return (
                            <div key={project.id} className="relative h-full">
                                <Link href={`/${locale}/projects/${project.id}`} className="block group h-full">
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
                                                <span>{new Date(project.startDate || Date.now()).toLocaleDateString(locale)}</span>
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

                                {/* Delete Button */}
                                <button
                                    onClick={(e) => handleDelete(project, e)}
                                    className="absolute bottom-3 right-3 z-10 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition"
                                    title={t('delete')}
                                >
                                    <span className="material-symbols-outlined text-xl">delete</span>
                                </button>

                                <Link
                                    href={projectChatHref}
                                    data-testid={`project-ai-link-${project.id}`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="absolute bottom-3 left-3 z-10 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-100"
                                >
                                    AIに相談
                                </Link>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
