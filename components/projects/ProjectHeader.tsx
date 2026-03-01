'use client';

import { useTranslations } from 'next-intl';
import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import ProjectEditModal from './ProjectEditModal';
import ArchiveConfirmation from './ArchiveConfirmation';
import UndoSnackbar from '../UndoSnackbar';
import { toastError, toastSuccess } from '@/lib/feedback';

type StageConfigItem = {
    key: string;
    label?: string;
    threshold: number; // Progress threshold (0-100)
    personalized?: boolean;
};

type StageConfig = StageConfigItem[];

const DEFAULT_STAGES: StageConfig = [
    { key: 'seedling', label: 'Seedling', threshold: 20 },
    { key: 'vegetative', label: 'Vegetative', threshold: 50 },
    { key: 'flowering', label: 'Flowering', threshold: 80 },
    { key: 'harvest', label: 'Harvest', threshold: 100 }
];

type KnowledgeStage = {
    key: string;
    label: string;
    duration: number;
    isPersonalized?: boolean;
};

type CropKnowledgeResponse = {
    knowledge?: {
        stages?: KnowledgeStage[];
    };
};

interface ProjectHeaderProps {
    project: {
        id: string;
        name: string;
        crop: string;
        variety?: string;
        startDate: string;
        targetHarvestDate?: string;
        status: string;
        notes?: string;
    };
    compact?: boolean;
    onReplanSchedule?: () => void;
}

export default function ProjectHeader({ project, compact, onReplanSchedule }: ProjectHeaderProps) {
    const t = useTranslations('projects');
    const router = useRouter();
    const params = useParams<{ locale: string }>();
    const locale = (params?.locale as string) || 'ja';
    const [showMenu, setShowMenu] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showArchiveDialog, setShowArchiveDialog] = useState(false);
    const [showUndoSnackbar, setShowUndoSnackbar] = useState(false);
    const [archiving, setArchiving] = useState(false);
    const [lastArchivedId, setLastArchivedId] = useState<string | null>(null);

    const [isExpanded, setIsExpanded] = useState(false);

    // Calculate progress
    const start = new Date(project.startDate).getTime();
    const now = new Date().getTime();
    const target = project.targetHarvestDate ? new Date(project.targetHarvestDate).getTime() : null;

    let progress = 0;
    const dayCount = Math.floor((now - start) / (1000 * 60 * 60 * 24));
    let totalDays = 0;

    if (target) {
        totalDays = Math.floor((target - start) / (1000 * 60 * 60 * 24));
        progress = Math.min(100, Math.max(0, (dayCount / totalDays) * 100));
    }

    const handleArchive = async () => {
        setArchiving(true);
        try {
            const res = await fetch(`/api/v1/projects/${project.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'archived' }),
            });

            if (!res.ok) throw new Error(t('archive_failed'));

            setLastArchivedId(project.id);
            setShowArchiveDialog(false);
            setShowUndoSnackbar(true);
            toastSuccess(t('archived_success', { name: project.name }));

            // Auto-hide snackbar and redirect after 10 seconds
            setTimeout(() => {
                setShowUndoSnackbar(false);
                router.push(`/${locale}/projects`);
            }, 10000);
        } catch (error) {
            console.error('Archive error:', error);
            toastError(t('archive_failed'), {
                label: '再試行',
                onClick: () => {
                    void handleArchive();
                },
            });
        } finally {
            setArchiving(false);
        }
    };

    const handleUndo = async () => {
        if (!lastArchivedId) return;

        try {
            const res = await fetch(`/api/v1/projects/${lastArchivedId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'active' }),
            });

            if (!res.ok) throw new Error(t('unarchive_failed'));

            setShowUndoSnackbar(false);
            toastSuccess(t('unarchived_success', { name: project.name }));
            router.refresh();
        } catch (error) {
            console.error('Unarchive error:', error);
            toastError(t('unarchive_failed'), {
                label: '再試行',
                onClick: () => {
                    void handleUndo();
                },
            });
        }
    };

    const [stages, setStages] = useState<StageConfig>(DEFAULT_STAGES);

    // Fetch dynamic stages
    useEffect(() => {
        const fetchStages = async () => {
            try {
                const res = await fetch(`/api/v1/knowledge/crops?crop=${encodeURIComponent(project.crop)}`);
                if (!res.ok) {
                    setStages(DEFAULT_STAGES);
                    return;
                }

                const data = await res.json() as CropKnowledgeResponse;
                const knowledgeStages = data.knowledge?.stages;
                if (!Array.isArray(knowledgeStages) || knowledgeStages.length === 0) {
                    setStages(DEFAULT_STAGES);
                    return;
                }

                const totalDuration = knowledgeStages.reduce((acc, s) => acc + s.duration, 0);
                let currentDuration = 0;

                const mappedStages: StageConfig = knowledgeStages.map((s) => {
                    currentDuration += s.duration;
                    return {
                        key: s.key,
                        label: s.label,
                        threshold: totalDuration > 0 ? Math.round((currentDuration / totalDuration) * 100) : 100,
                        personalized: s.isPersonalized,
                    };
                });

                setStages(mappedStages);
            } catch (error) {
                console.error('Failed to fetch stages:', error);
                setStages(DEFAULT_STAGES);
            }
        };

        fetchStages();
    }, [project.crop]);

    // Helper to get icon for stage key
    const getStageIcon = (key: string) => {
        if (key.includes('seedling')) return '🌱';
        if (key.includes('vegetative') || key.includes('tillering')) return '🌿';
        if (key.includes('flowering') || key.includes('heading')) return '🌾'; // Changed to rice ear for heading
        if (key.includes('ripening') || key.includes('fruiting')) return '🍂';
        if (key.includes('harvest')) return '🚜';
        return '✨';
    };

    // Determine current stage based on progress
    const getCurrentStage = (p: number, config: StageConfig) => {
        if (!config || config.length === 0) return 'seedling';
        for (const s of config) {
            if (p <= s.threshold) return s.key;
        }
        return config[config.length - 1].key;
    };

    const stage = getCurrentStage(progress, stages);
    const stageLabel = stages.find((s) => s.key === stage)?.label || stage;
    const cropLabel = `${project.crop}${project.variety ? ` (${project.variety})` : ''}`;

    const headerActions = (
        <div className="flex items-center gap-2 shrink-0">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-900"
                aria-expanded={isExpanded}
            >
                <span className="material-symbols-outlined text-[20px]">
                    {isExpanded ? 'expand_less' : 'expand_more'}
                </span>
            </button>

            <div className="relative border-l border-gray-200 pl-2">
                <button
                    onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                    className="rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-900"
                    data-testid="project-header-menu"
                >
                    <span className="material-symbols-outlined text-[20px]">more_vert</span>
                </button>
                {showMenu && (
                    <div className="absolute right-0 top-full z-50 mt-1 w-44 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                        {onReplanSchedule && (
                            <button
                                onClick={() => { setShowMenu(false); onReplanSchedule(); }}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                                data-testid="project-header-replan"
                            >
                                {t('replan_schedule')}
                            </button>
                        )}
                        <button
                            onClick={() => { setShowMenu(false); setShowEditModal(true); }}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                        >
                            {t('edit_project')}
                        </button>
                        <button
                            onClick={() => { setShowMenu(false); setShowArchiveDialog(true); }}
                            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                        >
                            {t('confirm_archive_title')}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );

    if (compact) {
        return (
            <>
                <div className={`w-full border border-gray-200 bg-white shadow-sm transition-all duration-300 ease-in-out ${isExpanded ? 'rounded-2xl p-4' : 'rounded-2xl p-3 sm:rounded-full sm:px-4 sm:py-2'}`}>
                    {!isExpanded ? (
                        <>
                            <div className="flex items-start justify-between gap-3 sm:hidden">
                                <div className="min-w-0">
                                    <h1 className="line-clamp-2 text-sm font-bold text-gray-900">{project.name}</h1>
                                    <p className="mt-1 text-xs text-gray-500">{cropLabel}</p>
                                </div>
                                {headerActions}
                            </div>

                            <div className="mt-3 flex items-center gap-3 sm:hidden">
                                <div className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                                    <span className="text-lg leading-none">{getStageIcon(stage)}</span>
                                    <span className="max-w-[8rem] truncate">{stageLabel}</span>
                                </div>
                                <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                                    <div
                                        className="h-full bg-green-500 transition-all duration-500"
                                        style={{ width: `${Math.min(100, progress)}%` }}
                                    />
                                </div>
                                <span className="text-[11px] font-semibold text-gray-500">{Math.round(progress)}%</span>
                            </div>

                            <div className="hidden w-full items-center gap-4 sm:flex">
                                <div className="min-w-0 shrink-0">
                                    <h1 className="max-w-[14rem] truncate text-sm font-bold text-gray-900">{project.name}</h1>
                                </div>
                                <div className="flex min-w-0 flex-1 items-center gap-3 px-2">
                                    <div className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-gray-700">
                                        <span className="text-lg leading-none">{getStageIcon(stage)}</span>
                                        <span className="hidden md:inline">{stageLabel}</span>
                                    </div>
                                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                                        <div
                                            className="h-full bg-green-500 transition-all duration-500"
                                            style={{ width: `${Math.min(100, progress)}%` }}
                                        />
                                    </div>
                                </div>
                                {headerActions}
                            </div>
                        </>
                    ) : null}

                    {/* Expanded Content (Full Analysis) */}
                    {isExpanded && (
                        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="mb-3 flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <h1 className="line-clamp-2 text-base font-bold text-gray-900">{project.name}</h1>
                                    <p className="mt-1 text-xs text-gray-500">
                                        {dayCount}日目 {totalDays ? `/ ${totalDays}日` : ''} · {cropLabel}
                                    </p>
                                </div>
                                {headerActions}
                            </div>

                            <div className="mb-2 flex items-center justify-between text-xs">
                                <span className="text-gray-500">{cropLabel}</span>
                                <span className="text-green-600 font-medium text-sm flex items-center gap-1">
                                    {getStageIcon(stage)} {stageLabel}
                                </span>
                            </div>

                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
                                <div
                                    className="h-full bg-green-500 transition-all duration-500"
                                    style={{ width: `${Math.min(100, progress)}%` }}
                                />
                            </div>

                            <div className="flex justify-between text-[11px] text-gray-400">
                                {stages.map((s) => (
                                    <div key={s.key} className={`flex flex-col items-center gap-1 ${stage === s.key ? 'text-green-600 font-bold' : ''}`}>
                                        <span>{s.label || s.key}</span>
                                        {stage === s.key && <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <ProjectEditModal
                    project={project}
                    isOpen={showEditModal}
                    onClose={() => setShowEditModal(false)}
                />

                <ArchiveConfirmation
                    projectName={project.name}
                    isOpen={showArchiveDialog}
                    onConfirm={handleArchive}
                    onCancel={() => setShowArchiveDialog(false)}
                    isLoading={archiving}
                />

                <UndoSnackbar
                    message={t('archived_success', { name: project.name })}
                    onUndo={handleUndo}
                    show={showUndoSnackbar}
                />
            </>
        );
    }

    return (
        <>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                {/* Top row: Title + Menu */}
                <div className="flex justify-between items-start mb-2">
                    <div>
                        <h1 className="text-lg font-bold text-gray-900">{project.name}</h1>
                        <p className="text-xs text-gray-500 mt-0.5">
                            {project.crop} {project.variety && `· ${project.variety}`}
                        </p>
                    </div>

                    <div className="relative">
                        <button
                            onClick={() => setShowMenu(!showMenu)}
                            className="p-1.5 text-gray-400 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center"
                            data-testid="project-header-menu"
                        >
                            <span className="material-symbols-outlined text-xl">more_vert</span>
                        </button>

                        {showMenu && (
                            <div className="absolute right-0 bottom-full mb-1 w-40 bg-white rounded-lg border border-gray-200 shadow-lg py-1 z-30">
                                {onReplanSchedule && (
                                    <button
                                        onClick={() => { setShowMenu(false); onReplanSchedule(); }}
                                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                        data-testid="project-header-replan"
                                    >
                                        {t('replan_schedule')}
                                    </button>
                                )}
                                <button
                                    onClick={() => { setShowMenu(false); setShowEditModal(true); }}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                >
                                    {t('edit_project')}
                                </button>
                                <button
                                    onClick={() => { setShowMenu(false); setShowArchiveDialog(true); }}
                                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                                >
                                    {t('confirm_archive_title')}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Progress info */}
                <div className="flex items-center justify-between text-xs mb-2">
                    <span className="text-gray-500">
                        {dayCount}日目 {totalDays ? `/ ${totalDays}日` : ''}
                    </span>
                    <span className="text-green-600 font-medium">
                        {getStageIcon(stage)} {stages.find(s => s.key === stage)?.label || stage}
                    </span>
                </div>

                {/* Simple progress bar */}
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-green-500 transition-all duration-500"
                        style={{ width: `${Math.min(100, progress)}%` }}
                    />
                </div>

                {/* Stage labels below */}
                <div className="flex justify-between mt-1.5 text-[10px] text-gray-400">
                    {stages.map((s) => (
                        <span
                            key={s.key}
                            className={stage === s.key ? 'text-green-600 font-bold' : ''}
                        >
                            {s.label || s.key}
                        </span>
                    ))}
                </div>
            </div>

            <ProjectEditModal
                project={project}
                isOpen={showEditModal}
                onClose={() => setShowEditModal(false)}
            />

            <ArchiveConfirmation
                projectName={project.name}
                isOpen={showArchiveDialog}
                onConfirm={handleArchive}
                onCancel={() => setShowArchiveDialog(false)}
                isLoading={archiving}
            />

            <UndoSnackbar
                message={t('archived_success', { name: project.name })}
                onUndo={handleUndo}
                show={showUndoSnackbar}
            />
        </>
    );
}
