'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { trackUXEvent } from '@/lib/analytics';
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
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h1 className="text-2xl font-bold text-gray-900">{t('list_title')}</h1>
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-3">
                    {/* Archive Toggle */}
                    {archivedProjects.length > 0 && (
                        <button
                            onClick={() => setShowArchived(!showArchived)}
                            data-testid="projects-show-archived-toggle"
                            className={`flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition sm:w-auto ${showArchived
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
                        data-testid="projects-create-link"
                        className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-white shadow-sm transition hover:bg-green-700 sm:w-auto"
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
                            onClick={() => {
                                void trackUXEvent('projects_context_chat_clicked', {
                                    surface: 'empty_state',
                                });
                            }}
                            className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-100"
                        >
                            {t('ask_ai_short')}
                        </Link>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
                    {displayProjects.map((project) => {
                        const isArchived = project.status === 'archived';
                        const projectChatHref = `/${locale}/chat?${new URLSearchParams({
                            intent: 'project',
                            projectId: project.id,
                            prompt: `${project.name}の今週の優先作業を整理して`,
                        }).toString()}`;
                        return (
                            <article key={project.id} data-testid={`project-card-${project.id}`} className="relative h-full">
                                <div className={`group flex h-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white transition hover:shadow-md ${isArchived ? 'opacity-60' : ''
                                    }`}>
                                    <Link
                                        href={`/${locale}/projects/${project.id}`}
                                        className="block flex-1 p-5"
                                    >
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
                                    </Link>

                                    <div
                                        data-testid={`project-card-actions-${project.id}`}
                                        className="flex flex-wrap gap-2 border-t border-gray-100 px-4 py-3 sm:hidden"
                                    >
                                        <Link
                                            href={`/${locale}/projects/${project.id}`}
                                            data-testid={`project-open-link-${project.id}-mobile`}
                                            className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-green-700"
                                        >
                                            {t('open_project_short')}
                                        </Link>
                                        <Link
                                            href={projectChatHref}
                                            data-testid={`project-ai-link-${project.id}-mobile`}
                                            onClick={() => {
                                                void trackUXEvent('projects_context_chat_clicked', {
                                                    surface: 'project_card_mobile',
                                                    projectId: project.id,
                                                });
                                            }}
                                            className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-100"
                                        >
                                            {t('ask_ai_short')}
                                        </Link>
                                        {isArchived ? (
                                            <button
                                                onClick={(e) => handleUnarchive(project.id, e)}
                                                data-testid={`project-unarchive-button-${project.id}-mobile`}
                                                className="inline-flex min-h-[44px] items-center justify-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
                                            >
                                                <span className="material-symbols-outlined text-base">unarchive</span>
                                                {t('unarchive')}
                                            </button>
                                        ) : (
                                            <button
                                                onClick={(e) => handleDelete(project, e)}
                                                data-testid={`project-delete-button-${project.id}-mobile`}
                                                className="inline-flex min-h-[44px] items-center justify-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
                                                title={t('delete')}
                                            >
                                                <span className="material-symbols-outlined text-base">delete</span>
                                                {t('delete')}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Unarchive Button for Archived Projects */}
                                {isArchived && (
                                    <button
                                        onClick={(e) => handleUnarchive(project.id, e)}
                                        data-testid={`project-unarchive-button-${project.id}-desktop`}
                                        className="absolute right-3 top-3 z-10 hidden items-center gap-1 rounded-lg border border-gray-200 bg-white p-2 text-xs font-medium text-blue-600 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 sm:flex"
                                    >
                                        <span className="material-symbols-outlined text-base">unarchive</span>
                                        {t('unarchive')}
                                    </button>
                                )}

                                {/* Delete Button */}
                                <button
                                    onClick={(e) => handleDelete(project, e)}
                                    data-testid={`project-delete-button-${project.id}-desktop`}
                                    className="absolute bottom-3 right-3 z-10 hidden rounded-full p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-600 sm:block"
                                    title={t('delete')}
                                >
                                    <span className="material-symbols-outlined text-xl">delete</span>
                                </button>

                                <Link
                                    href={projectChatHref}
                                    data-testid={`project-ai-link-${project.id}`}
                                    onClick={() => {
                                        void trackUXEvent('projects_context_chat_clicked', {
                                            surface: 'project_card',
                                            projectId: project.id,
                                        });
                                    }}
                                    className="absolute bottom-3 left-3 z-10 hidden rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-100 sm:inline-flex"
                                >
                                    {t('ask_ai_short')}
                                </Link>
                            </article>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
