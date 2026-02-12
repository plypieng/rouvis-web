'use client';

import { useTranslations } from 'next-intl';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import ProjectEditModal from './ProjectEditModal';
import ArchiveConfirmation from './ArchiveConfirmation';
import UndoSnackbar from '../UndoSnackbar';
import { SeasonRail } from '@/components/workflow/SeasonRail';
import { buildSeasonRailState, normalizeCropStage } from '@/lib/workflow-ui';
import type { CropStage, RiskTone } from '@/types/ui-shell';

type StageConfigItem = {
  key: string;
  label?: string;
  threshold: number;
  personalized?: boolean;
};

type StageConfig = StageConfigItem[];

const DEFAULT_STAGES: StageConfig = [
  { key: 'seedling', label: 'Seedling', threshold: 20 },
  { key: 'vegetative', label: 'Vegetative', threshold: 50 },
  { key: 'flowering', label: 'Flowering', threshold: 80 },
  { key: 'harvest', label: 'Harvest', threshold: 100 },
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
}

function getCurrentStage(progress: number, config: StageConfig): string {
  if (!config.length) return 'seedling';
  for (const stage of config) {
    if (progress <= stage.threshold) return stage.key;
  }
  return config[config.length - 1].key;
}

function stageMilestones(stages: StageConfig, progress: number) {
  const currentStageKey = getCurrentStage(progress, stages);
  return stages.slice(0, 4).map((stage) => {
    let state: 'done' | 'current' | 'upcoming' = 'upcoming';
    if (progress >= stage.threshold) {
      state = 'done';
    } else if (stage.key === currentStageKey) {
      state = 'current';
    }

    return {
      id: stage.key,
      label: stage.label || stage.key,
      stage: normalizeCropStage(stage.key) as CropStage,
      state,
      note: stage.personalized ? 'Personalized' : undefined,
    };
  });
}

function riskFromTimeline(progress: number, dayCount: number, totalDays: number): RiskTone {
  if (totalDays > 0 && dayCount > totalDays) return 'warning';
  if (progress < 20) return 'watch';
  if (progress >= 85) return 'warning';
  return 'safe';
}

export default function ProjectHeader({ project, compact }: ProjectHeaderProps) {
  const t = useTranslations('projects');
  const router = useRouter();
  const params = useParams<{ locale: string }>();
  const locale = (params?.locale as string) || 'ja';
  const { data: session } = useSession();

  const [showMenu, setShowMenu] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [showUndoSnackbar, setShowUndoSnackbar] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [lastArchivedId, setLastArchivedId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [stages, setStages] = useState<StageConfig>(DEFAULT_STAGES);

  const start = new Date(project.startDate).getTime();
  const now = Date.now();
  const target = project.targetHarvestDate ? new Date(project.targetHarvestDate).getTime() : null;
  const dayCount = Math.max(0, Math.floor((now - start) / (1000 * 60 * 60 * 24)));

  let progress = 0;
  let totalDays = 0;

  if (target) {
    totalDays = Math.max(0, Math.floor((target - start) / (1000 * 60 * 60 * 24)));
    progress = totalDays > 0 ? Math.min(100, Math.max(0, (dayCount / totalDays) * 100)) : 0;
  }

  useEffect(() => {
    const fetchStages = async () => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
        const userId = (session?.user as { id?: string })?.id;
        const res = await fetch(
          `${baseUrl}/api/v1/knowledge/crops?crop=${encodeURIComponent(project.crop)}${
            userId ? `&userId=${encodeURIComponent(userId)}` : ''
          }`
        );

        if (!res.ok) {
          setStages(DEFAULT_STAGES);
          return;
        }

        const data = (await res.json()) as CropKnowledgeResponse;
        const knowledgeStages = data.knowledge?.stages;

        if (!Array.isArray(knowledgeStages) || knowledgeStages.length === 0) {
          setStages(DEFAULT_STAGES);
          return;
        }

        const totalDuration = knowledgeStages.reduce((acc, stage) => acc + stage.duration, 0);
        let currentDuration = 0;

        const mappedStages: StageConfig = knowledgeStages.map((stage) => {
          currentDuration += stage.duration;
          return {
            key: stage.key,
            label: stage.label,
            threshold: totalDuration > 0 ? Math.round((currentDuration / totalDuration) * 100) : 100,
            personalized: stage.isPersonalized,
          };
        });

        setStages(mappedStages);
      } catch (error) {
        console.error('Failed to fetch stages:', error);
        setStages(DEFAULT_STAGES);
      }
    };

    void fetchStages();
  }, [project.crop, session?.user]);

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

      setTimeout(() => {
        setShowUndoSnackbar(false);
        router.push(`/${locale}/projects`);
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
      const res = await fetch(`/api/v1/projects/${lastArchivedId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' }),
      });

      if (!res.ok) throw new Error(t('unarchive_failed'));

      setShowUndoSnackbar(false);
      router.refresh();
    } catch (error) {
      console.error('Unarchive error:', error);
      alert(t('unarchive_failed'));
    }
  };

  const currentStage = getCurrentStage(progress, stages);
  const risk = riskFromTimeline(progress, dayCount, totalDays);

  const seasonState = {
    ...buildSeasonRailState({
      stage: currentStage,
      progress,
      dayCount,
      totalDays,
      risk,
      windowLabel: project.targetHarvestDate
        ? `${locale === 'ja' ? '収穫予定' : 'Target harvest'}: ${new Date(project.targetHarvestDate).toLocaleDateString(locale)}`
        : locale === 'ja'
          ? '収穫予定日が未設定です'
          : 'Harvest date not set yet',
      note:
        risk === 'warning'
          ? locale === 'ja'
            ? '進行に遅れが出る前に今週の作業を再確認してください。'
            : 'Review this week plan to avoid timeline slippage.'
          : locale === 'ja'
            ? '現在の進行は計画範囲内です。'
            : 'Current progress is within planned range.',
    }),
    milestones: stageMilestones(stages, progress),
  };

  const actionMenu = (
    <div className="absolute right-0 top-full z-30 mt-2 w-44 rounded-lg border border-border bg-card p-1 shadow-lift1">
      <button
        onClick={() => {
          setShowMenu(false);
          setShowEditModal(true);
        }}
        className="w-full rounded-md px-3 py-2 text-left text-sm text-foreground hover:bg-secondary"
      >
        {t('edit_project')}
      </button>
      <button
        onClick={() => {
          setShowMenu(false);
          setShowArchiveDialog(true);
        }}
        className="w-full rounded-md px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
      >
        {t('confirm_archive_title')}
      </button>
    </div>
  );

  if (compact) {
    return (
      <>
        <div className="surface-base p-3 sm:p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                {project.crop}
                {project.variety ? ` · ${project.variety}` : ''}
              </p>
              <h1 className="truncate text-base font-semibold text-foreground sm:text-lg">{project.name}</h1>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsExpanded((prev) => !prev)}
                className="touch-target rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                aria-expanded={isExpanded}
                aria-label={isExpanded ? 'Collapse project details' : 'Expand project details'}
              >
                <span className="material-symbols-outlined text-[20px]">{isExpanded ? 'expand_less' : 'expand_more'}</span>
              </button>

              <div className="relative">
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    setShowMenu((prev) => !prev);
                  }}
                  className="touch-target rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                  aria-label="Project menu"
                >
                  <span className="material-symbols-outlined text-[20px]">more_vert</span>
                </button>
                {showMenu ? actionMenu : null}
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {locale === 'ja' ? `${dayCount}日目` : `Day ${dayCount}`}
              {totalDays > 0 ? ` / ${totalDays}` : ''}
            </span>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${risk === 'safe' ? 'status-safe' : risk === 'watch' ? 'status-watch' : risk === 'warning' ? 'status-warning' : 'status-critical'}`}>
              {currentStage}
            </span>
          </div>

          <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
            <div className="h-full rounded-full bg-brand-seedling transition-[width] duration-300" style={{ width: `${Math.min(100, progress)}%` }} />
          </div>

          {isExpanded ? <SeasonRail state={seasonState} className="mt-3" /> : null}
        </div>

        <ProjectEditModal project={project} isOpen={showEditModal} onClose={() => setShowEditModal(false)} />

        <ArchiveConfirmation
          projectName={project.name}
          isOpen={showArchiveDialog}
          onConfirm={handleArchive}
          onCancel={() => setShowArchiveDialog(false)}
          isLoading={archiving}
        />

        <UndoSnackbar message={t('archived_success', { name: project.name })} onUndo={handleUndo} show={showUndoSnackbar} />
      </>
    );
  }

  return (
    <>
      <section className="surface-raised p-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              {project.crop}
              {project.variety ? ` · ${project.variety}` : ''}
            </p>
            <h1 className="text-2xl font-semibold text-foreground">{project.name}</h1>
          </div>

          <div className="relative">
            <button
              onClick={() => setShowMenu((prev) => !prev)}
              className="touch-target rounded-md p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
              aria-label="Project menu"
            >
              <span className="material-symbols-outlined text-[20px]">more_vert</span>
            </button>
            {showMenu ? actionMenu : null}
          </div>
        </div>

        <SeasonRail state={seasonState} />
      </section>

      <ProjectEditModal project={project} isOpen={showEditModal} onClose={() => setShowEditModal(false)} />

      <ArchiveConfirmation
        projectName={project.name}
        isOpen={showArchiveDialog}
        onConfirm={handleArchive}
        onCancel={() => setShowArchiveDialog(false)}
        isLoading={archiving}
      />

      <UndoSnackbar message={t('archived_success', { name: project.name })} onUndo={handleUndo} show={showUndoSnackbar} />
    </>
  );
}
