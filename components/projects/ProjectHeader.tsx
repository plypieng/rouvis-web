'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import ProjectEditModal from './ProjectEditModal';
import ArchiveConfirmation from './ArchiveConfirmation';
import UndoSnackbar from '../UndoSnackbar';

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
}

export default function ProjectHeader({ project }: ProjectHeaderProps) {
    const t = useTranslations('projects');
    const tHeader = useTranslations('projects.header');
    const router = useRouter();
    const [showMenu, setShowMenu] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showArchiveDialog, setShowArchiveDialog] = useState(false);
    const [showUndoSnackbar, setShowUndoSnackbar] = useState(false);
    const [archiving, setArchiving] = useState(false);
    const [lastArchivedId, setLastArchivedId] = useState<string | null>(null);

    // Calculate progress
    const start = new Date(project.startDate).getTime();
    const now = new Date().getTime();
    const target = project.targetHarvestDate ? new Date(project.targetHarvestDate).getTime() : null;

    let progress = 0;
    let dayCount = Math.floor((now - start) / (1000 * 60 * 60 * 24));
    let totalDays = 0;

    if (target) {
        totalDays = Math.floor((target - start) / (1000 * 60 * 60 * 24));
        progress = Math.min(100, Math.max(0, (dayCount / totalDays) * 100));
    }

    const handleArchive = async () => {
        setArchiving(true);
        try {
            const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
            const res = await fetch(`${baseUrl}/api/v1/projects/${project.id}/archive`, {
                method: 'POST',
            });

            if (!res.ok) throw new Error(t('archive_failed'));

            setLastArchivedId(project.id);
            setShowArchiveDialog(false);
            setShowUndoSnackbar(true);

            // Auto-hide snackbar and redirect after 10 seconds
            setTimeout(() => {
                setShowUndoSnackbar(false);
                router.push('/ja/projects');
            }, 10000);
        } catch (error) {
            console.error('Archive error:', error);
            alert(t('archive_failed'));
        } finally {
            setArchiving(false);
        }
    };

    const handleUndo = async () => {
        if (!lastArchivedId) return;

        try {
            const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
            const res = await fetch(`${baseUrl}/api/v1/projects/${lastArchivedId}/archive`, {
                method: 'DELETE',
            });

            if (!res.ok) throw new Error(t('unarchive_failed'));

            setShowUndoSnackbar(false);
            router.refresh();
        } catch (error) {
            console.error('Unarchive error:', error);
            alert(t('unarchive_failed'));
        }
    };

    // Stage Configuration
    type StageConfig = {
        key: string;
        icon?: string; // Optional now as we map it
        labelKey?: string; // Optional
        label?: string; // Direct label from DB
        threshold: number; // Progress threshold (0-100)
        personalized?: boolean; // New flag for overrides
    }[];

    const [stages, setStages] = useState<StageConfig>([]);
    const [loadingStages, setLoadingStages] = useState(true);

    // Default Fallback Stages
    const DEFAULT_STAGES: StageConfig = [
        { key: 'seedling', label: 'Seedling', threshold: 20 },
        { key: 'vegetative', label: 'Vegetative', threshold: 50 },
        { key: 'flowering', label: 'Flowering', threshold: 80 },
        { key: 'harvest', label: 'Harvest', threshold: 100 }
    ];

    // Fetch dynamic stages
    useEffect(() => {
        const fetchStages = async () => {
            try {
                const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
                // Pass userId=demo-user to get personalized overrides
                const res = await fetch(`${baseUrl}/api/v1/knowledge/crops?crop=${encodeURIComponent(project.crop)}&userId=demo-user`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.knowledge?.stages) {
                        // Transform DB stages to UI config
                        // Calculate thresholds based on duration
                        const dbStages = data.knowledge.stages;
                        const totalDuration = dbStages.reduce((acc: number, s: any) => acc + s.duration, 0);
                        let currentDuration = 0;

                        const mappedStages = dbStages.map((s: any) => {
                            currentDuration += s.duration;
                            return {
                                key: s.key,
                                label: s.label, // Use label from DB (which might include Japanese)
                                threshold: Math.round((currentDuration / totalDuration) * 100),
                                personalized: s.isPersonalized
                            };
                        });
                        setStages(mappedStages);
                        return;
                    }
                }
            } catch (error) {
                console.error('Failed to fetch stages:', error);
            } finally {
                setLoadingStages(false);
            }
            // Fallback
            setStages(DEFAULT_STAGES);
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

    const getBgColor = () => {
        if (stage === 'seedling') return 'from-green-100 to-green-200';
        if (stage === 'vegetative' || stage === 'tillering') return 'from-green-300 to-green-500';
        if (stage === 'flowering' || stage === 'heading') return 'from-yellow-200 to-green-400';
        if (stage === 'ripening') return 'from-yellow-400 to-orange-400';
        if (stage === 'harvest') return 'from-orange-200 to-red-400';
        return 'from-blue-100 to-blue-200';
    };

    return (
        <>
            <div className="bg-card rounded-2xl border border-border p-6 mb-6">
                {/* Top row: Title + Menu */}
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h1 className="text-xl font-semibold text-foreground">{project.name}</h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            {project.crop} {project.variety && `· ${project.variety}`}
                        </p>
                    </div>
                    
                    <div className="relative">
                        <button
                            onClick={() => setShowMenu(!showMenu)}
                            className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                        >
                            ⋮
                        </button>

                        {showMenu && (
                            <div className="absolute right-0 mt-1 w-40 bg-card rounded-lg border border-border shadow-lg py-1 z-10">
                                <button
                                    onClick={() => { setShowMenu(false); setShowEditModal(true); }}
                                    className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-secondary"
                                >
                                    {t('edit_project')}
                                </button>
                                <button
                                    onClick={() => { setShowMenu(false); setShowArchiveDialog(true); }}
                                    className="w-full text-left px-4 py-2 text-sm text-destructive hover:bg-destructive/10"
                                >
                                    {t('confirm_archive_title')}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Progress info */}
                <div className="flex items-center justify-between text-sm mb-4">
                    <span className="text-muted-foreground">
                        {dayCount}日目 {totalDays ? `/ ${totalDays}日` : ''}
                    </span>
                    <span className="text-primary font-medium">
                        {getStageIcon(stage)} {stages.find(s => s.key === stage)?.label || stage}
                    </span>
                </div>

                {/* Simple progress bar */}
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-primary transition-all duration-500"
                        style={{ width: `${Math.min(100, progress)}%` }}
                    />
                </div>

                {/* Stage labels below */}
                <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                    {stages.map((s) => (
                        <span 
                            key={s.key} 
                            className={stage === s.key ? 'text-primary font-medium' : ''}
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
