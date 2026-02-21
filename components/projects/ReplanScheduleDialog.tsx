'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import AIProcessingOverlay from './AIProcessingOverlay';
import ScheduleConstraintForm, {
  advancedConstraintsFromTemplate,
  buildSchedulingPreferencesPayload,
  normalizeAdvancedConstraints,
  parsePositiveNumber,
  type ScheduleConstraintAdvanced,
  type ScheduleConstraintTemplate,
  type YieldRecommendation,
  type YieldUnit,
} from './ScheduleConstraintForm';
import { toastError, toastInfo, toastSuccess } from '@/lib/feedback';
import { trackUXEvent } from '@/lib/analytics';
import {
  statusForScheduleStage,
  type ScheduleProcessingStatus,
} from './scheduleProgress';

type PreferenceTemplateCatalog = {
  templates?: ScheduleConstraintTemplate[];
  recommendedTemplate?: string;
};

type ProjectSchedulingPreferences = {
  preferredWorkStartHour?: number;
  preferredWorkEndHour?: number;
  maxTasksPerDay?: number;
  avoidWeekdays?: number[];
  riskTolerance?: 'conservative' | 'balanced' | 'aggressive';
  irrigationStyle?: 'manual' | 'reminder' | 'strict';
  constraintsNote?: string;
  targetYieldValue?: number;
  targetYieldUnit?: YieldUnit;
  targetYieldRecommended?: number;
  targetYieldMin?: number;
  targetYieldMax?: number;
  targetYieldEnvironment?: 'open_field' | 'greenhouse' | 'home_pot';
} | null;

type ProjectForReplan = {
  id: string;
  crop: string;
  variety?: string;
  startDate: string;
  targetHarvestDate?: string;
  notes?: string;
  primaryFieldId?: string | null;
  schedulingPreferences?: ProjectSchedulingPreferences;
};

type ReplanResult = {
  mode: 'replace_open' | 'replace_all';
  taskCount?: number;
  revisionId?: string;
  asyncAccepted?: boolean;
  generationRunId?: string;
};

type ReplanScheduleDialogProps = {
  open: boolean;
  onClose: () => void;
  project: ProjectForReplan;
  hasTasks: boolean;
  onReplanned?: (result: ReplanResult) => void;
};

function parseYieldRecommendation(preferences: ProjectSchedulingPreferences): YieldRecommendation | null {
  if (!preferences) return null;
  if (
    typeof preferences.targetYieldRecommended !== 'number'
    || typeof preferences.targetYieldMin !== 'number'
    || typeof preferences.targetYieldMax !== 'number'
    || !preferences.targetYieldEnvironment
  ) {
    return null;
  }

  return {
    value: preferences.targetYieldRecommended,
    unit: preferences.targetYieldUnit === 'kg_total' ? 'kg_total' : 't_per_ha',
    min: preferences.targetYieldMin,
    max: preferences.targetYieldMax,
    environment: preferences.targetYieldEnvironment,
    rationale: 'From current project preferences',
  };
}

function isBackfilledProject(startDate: string): boolean {
  const parsed = new Date(startDate);
  if (!Number.isFinite(parsed.getTime())) return false;
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return parsed.getTime() < sevenDaysAgo;
}

export default function ReplanScheduleDialog({
  open,
  onClose,
  project,
  hasTasks,
  onReplanned,
}: ReplanScheduleDialogProps) {
  const t = useTranslations('projects');
  const [templates, setTemplates] = useState<ScheduleConstraintTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templatesError, setTemplatesError] = useState<string | null>(null);
  const [recommendedTemplateId, setRecommendedTemplateId] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [preferredYieldInput, setPreferredYieldInput] = useState('');
  const [preferredYieldUnit, setPreferredYieldUnit] = useState<YieldUnit>('t_per_ha');
  const [yieldRecommendation, setYieldRecommendation] = useState<YieldRecommendation | null>(null);
  const [advancedConstraints, setAdvancedConstraints] = useState<ScheduleConstraintAdvanced>(
    normalizeAdvancedConstraints()
  );
  const [showAdvancedConstraints, setShowAdvancedConstraints] = useState(false);
  const [mode, setMode] = useState<'replace_open' | 'replace_all'>('replace_open');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<ScheduleProcessingStatus | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [schedulingStartDate, setSchedulingStartDate] = useState(() => new Date().toISOString().split('T')[0]);

  const activeTemplates = useMemo(
    () => templates.filter((template) => (template.status ?? 'active') === 'active'),
    [templates]
  );

  const effectiveTemplateId = useMemo(() => {
    if (selectedTemplateId && activeTemplates.some((template) => template.id === selectedTemplateId)) {
      return selectedTemplateId;
    }
    if (recommendedTemplateId && activeTemplates.some((template) => template.id === recommendedTemplateId)) {
      return recommendedTemplateId;
    }
    return activeTemplates[0]?.id ?? null;
  }, [activeTemplates, recommendedTemplateId, selectedTemplateId]);

  const effectiveTemplate = useMemo(
    () => activeTemplates.find((template) => template.id === effectiveTemplateId) ?? null,
    [activeTemplates, effectiveTemplateId]
  );

  const preferredYieldValue = useMemo(
    () => parsePositiveNumber(preferredYieldInput),
    [preferredYieldInput]
  );

  const hasInvalidYieldInput = preferredYieldInput.trim().length > 0 && preferredYieldValue === null;

  const schedulingPreferences = useMemo(() => buildSchedulingPreferencesPayload({
    template: effectiveTemplate,
    advanced: advancedConstraints,
    preferredYieldInput,
    preferredYieldUnit,
    yieldRecommendation,
  }), [advancedConstraints, effectiveTemplate, preferredYieldInput, preferredYieldUnit, yieldRecommendation]);

  useEffect(() => {
    if (!open) return;

    setMode(hasTasks ? 'replace_open' : 'replace_all');
    setErrorMessage(null);
    setProcessingStatus(null);
    setNote('');

    const preferences = project.schedulingPreferences || null;
    setYieldRecommendation(parseYieldRecommendation(preferences));

    if (typeof preferences?.targetYieldValue === 'number') {
      setPreferredYieldInput(String(preferences.targetYieldValue));
      setPreferredYieldUnit(preferences.targetYieldUnit === 'kg_total' ? 'kg_total' : 't_per_ha');
    } else {
      setPreferredYieldInput('');
      setPreferredYieldUnit('t_per_ha');
    }

    setAdvancedConstraints(normalizeAdvancedConstraints(preferences || undefined));
    setShowAdvancedConstraints(false);
  }, [hasTasks, open, project.schedulingPreferences]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    const fetchTemplates = async () => {
      setTemplatesLoading(true);
      setTemplatesError(null);
      try {
        const response = await fetch('/api/v1/projects/preference-templates');
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            (payload as Record<string, unknown>)?.error as string
            || (payload as Record<string, unknown>)?.message as string
            || 'Failed to load templates'
          );
        }

        if (cancelled) return;

        const catalog = payload as PreferenceTemplateCatalog;
        const nextTemplates = Array.isArray(catalog.templates) ? catalog.templates : [];
        const nextRecommended = typeof catalog.recommendedTemplate === 'string'
          ? catalog.recommendedTemplate
          : null;

        setTemplates(nextTemplates);
        setRecommendedTemplateId(nextRecommended);
        setSelectedTemplateId((current) => {
          if (current && nextTemplates.some((template) => template.id === current)) return current;
          if (nextRecommended && nextTemplates.some((template) => template.id === nextRecommended)) return nextRecommended;
          return nextTemplates[0]?.id ?? null;
        });
      } catch (error) {
        if (!cancelled) {
          setTemplates([]);
          setRecommendedTemplateId(null);
          setSelectedTemplateId(null);
          setTemplatesError(error instanceof Error ? error.message : 'Failed to load templates');
        }
      } finally {
        if (!cancelled) {
          setTemplatesLoading(false);
        }
      }
    };

    void fetchTemplates();
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!effectiveTemplate) return;
    setAdvancedConstraints(advancedConstraintsFromTemplate(effectiveTemplate));
  }, [effectiveTemplate]);

  const handleGenerate = async () => {
    if (!project.primaryFieldId) {
      const message = t('replan_dialog.error_primary_field');
      setErrorMessage(message);
      toastError(message);
      return;
    }

    if (hasInvalidYieldInput) {
      setErrorMessage(t('replan_dialog.error_invalid_yield'));
      return;
    }

    const startDate = project.startDate || new Date().toISOString().split('T')[0];
    const useBackfilled = isBackfilledProject(startDate);
    const endpoint = useBackfilled
      ? '/api/v1/agents/generate-backfilled-schedule'
      : '/api/v1/agents/generate-schedule';

    setSubmitting(true);
    setErrorMessage(null);
    setProcessingStatus(statusForScheduleStage('prepare'));

    void trackUXEvent('replan_started', {
      projectId: project.id,
      mode,
      source: 'project_replan',
    });

    try {
      toastInfo(t('replan_dialog.generating_toast'));
      setProcessingStatus(statusForScheduleStage('generate_schedule'));
      const generationPayload = useBackfilled
        ? {
          projectId: project.id,
          source: 'project_replan',
          replanMode: mode,
          ...(effectiveTemplateId ? { preferenceTemplate: effectiveTemplateId } : {}),
          ...(schedulingPreferences ? { schedulingPreferences } : {}),
          ...(note.trim() ? { note: note.trim() } : {}),
          cropAnalysis: {
            crop: project.crop,
            variety: project.variety,
            startDate,
            targetHarvestDate: project.targetHarvestDate || '',
            notes: project.notes,
          },
          plantingDate: startDate,
          currentDate: schedulingStartDate,
        }
        : {
          projectId: project.id,
          source: 'project_replan',
          replanMode: mode,
          ...(effectiveTemplateId ? { preferenceTemplate: effectiveTemplateId } : {}),
          ...(schedulingPreferences ? { schedulingPreferences } : {}),
          ...(note.trim() ? { note: note.trim() } : {}),
          cropAnalysis: {
            crop: project.crop,
            variety: project.variety,
            startDate,
            targetHarvestDate: project.targetHarvestDate || '',
            notes: project.notes,
          },
          currentDate: schedulingStartDate,
        };

      const generationResponse = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(generationPayload),
      });

      const generatedData = await generationResponse.json().catch(() => ({}));
      if (!generationResponse.ok) {
        throw new Error(
          (generatedData as Record<string, unknown>)?.error as string
          || (generatedData as Record<string, unknown>)?.message as string
          || 'Failed to generate schedule'
        );
      }

      const generation = (generatedData as Record<string, unknown>)?.generation as Record<string, unknown> | undefined;
      if (generationResponse.status === 202 || generation?.mode === 'async') {
        const runId = typeof generation?.runId === 'string' ? generation.runId : undefined;
        toastInfo('再計画を受け付けました。進捗を表示します。');
        void trackUXEvent('replan_accepted_async', {
          projectId: project.id,
          mode,
          source: 'project_replan',
          runId: runId || null,
        });
        onReplanned?.({
          mode,
          asyncAccepted: true,
          generationRunId: runId,
        });
        onClose();
        return;
      }

      setProcessingStatus(statusForScheduleStage('finalize'));
      const taskCount = typeof (generatedData as Record<string, unknown>)?.taskCount === 'number'
        ? (generatedData as Record<string, unknown>).taskCount as number
        : 0;
      toastSuccess(t('replan_dialog.success_toast', { count: taskCount }));

      void trackUXEvent('replan_completed', {
        projectId: project.id,
        mode,
        source: 'project_replan',
        taskCount,
        generationMode: 'sync',
      });

      onReplanned?.({
        taskCount,
        mode,
        revisionId: typeof (generatedData as Record<string, unknown>)?.commitRevisionId === 'string'
          ? (generatedData as Record<string, unknown>).commitRevisionId as string
          : undefined,
      });
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : t('replan_dialog.error_generic');
      setErrorMessage(message);
      toastError(message);
      void trackUXEvent('replan_failed', {
        projectId: project.id,
        mode,
        source: 'project_replan',
        message,
      });
    } finally {
      setSubmitting(false);
      setProcessingStatus(null);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4 backdrop-blur-sm"
      onClick={() => {
        if (submitting) return;
        onClose();
      }}
    >
      <div
        className="surface-overlay relative w-full max-w-4xl overflow-hidden"
        onClick={(event) => event.stopPropagation()}
        data-testid="replan-dialog"
      >
        {submitting && (
          <AIProcessingOverlay
            mode="schedule"
            statusMessage={processingStatus?.message}
            statusDetail={processingStatus?.detail}
            progress={processingStatus?.progress}
            testId="replan-schedule-processing-overlay"
          />
        )}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <h2 className="text-base font-semibold text-foreground">{t('replan_dialog.title')}</h2>
            <p className="text-xs text-muted-foreground">{t('replan_dialog.subtitle')}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="touch-target rounded-full p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
            aria-label="Close"
            disabled={submitting}
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div className="max-h-[78vh] overflow-y-auto px-4 py-4">
          <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="text-xs font-medium text-muted-foreground">
              {t('replan_dialog.scope_label')}
              <select
                value={mode}
                onChange={(event) => setMode(event.target.value as 'replace_open' | 'replace_all')}
                className="control-inset mt-1 w-full px-3 py-2 text-sm"
                data-testid="replan-mode-select"
              >
                <option value="replace_open">{t('replan_scope_replace_open')}</option>
                <option value="replace_all">{t('replan_scope_replace_all')}</option>
              </select>
            </label>
            <label className="text-xs font-medium text-muted-foreground">
              {t('replan_dialog.note_label')}
              <input
                type="text"
                value={note}
                onChange={(event) => setNote(event.target.value.slice(0, 500))}
                className="control-inset mt-1 w-full px-3 py-2 text-sm"
                placeholder={t('replan_dialog.note_placeholder')}
              />
            </label>
          </div>

          <div className="mb-4">
            <label className="text-xs font-medium text-muted-foreground">
              スケジュール開始日
              <input
                type="date"
                value={schedulingStartDate}
                onChange={(event) => setSchedulingStartDate(event.target.value)}
                className="control-inset mt-1 w-full px-3 py-2 text-sm"
                data-testid="replan-scheduling-start-date"
              />
            </label>
            <p className="mt-1 text-xs text-muted-foreground">スケジュールの起点となる日付を選択できます（デフォルト：今日）</p>
          </div>

          <ScheduleConstraintForm
            templates={templates}
            templatesLoading={templatesLoading}
            templatesError={templatesError}
            recommendedTemplateId={recommendedTemplateId}
            selectedTemplateId={effectiveTemplateId}
            onSelectTemplate={(templateId) => {
              setSelectedTemplateId(templateId);
              const selectedTemplate = templates.find((template) => template.id === templateId);
              if (selectedTemplate) {
                setAdvancedConstraints(advancedConstraintsFromTemplate(selectedTemplate));
              }
            }}
            preferredYieldInput={preferredYieldInput}
            preferredYieldUnit={preferredYieldUnit}
            onChangeYieldInput={setPreferredYieldInput}
            onChangeYieldUnit={setPreferredYieldUnit}
            yieldRecommendation={yieldRecommendation}
            hasInvalidYieldInput={hasInvalidYieldInput}
            onApplyRecommendedYield={() => {
              if (!yieldRecommendation) return;
              setPreferredYieldInput(String(yieldRecommendation.value));
              setPreferredYieldUnit(yieldRecommendation.unit);
            }}
            advanced={advancedConstraints}
            onChangeAdvanced={setAdvancedConstraints}
            showAdvanced={showAdvancedConstraints}
            onChangeShowAdvanced={setShowAdvancedConstraints}
          />

          {errorMessage ? (
            <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</p>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border px-3 py-2 text-sm font-semibold text-foreground hover:bg-secondary"
            disabled={submitting}
          >
            {t('replan_dialog.cancel')}
          </button>
          <button
            type="button"
            onClick={() => {
              void handleGenerate();
            }}
            disabled={submitting || hasInvalidYieldInput || !project.primaryFieldId}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-55"
            data-testid="replan-submit"
          >
            {submitting ? t('replan_dialog.submitting') : t('replan_dialog.submit')}
          </button>
        </div>
      </div>
    </div>
  );
}
