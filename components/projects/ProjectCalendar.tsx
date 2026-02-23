'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { format, addMonths, subMonths, addYears, subYears, startOfMonth, endOfMonth } from 'date-fns';
import {
  DndContext,
  type DragEndEvent,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import MonthGrid from './calendar/MonthGrid';
import ProjectYearView from './ProjectYearView';
import TaskSidePanel from './calendar/TaskSidePanel';
import ProjectInsightsPanel from './ProjectInsightsPanel';
import { useWeatherTimeline } from '@/hooks/useWeatherTimeline';
import { isRainRiskDay, isWeatherSensitiveTask } from '@/lib/weather-timeline';
import type {
  CommandHandshake,
  PhenologyFeedbackReason,
  ProjectTaskItem,
  QuickApplyResult,
  QuickApplyState,
  TaskMovePayload,
} from '@/types/project-cockpit';

interface ProjectCalendarProps {
  startDate: string;
  targetHarvestDate?: string;
  tasks: ProjectTaskItem[];
  project: {
    id: string;
    crop: string;
    currentStage?: string;
  };
  onRescheduleRequest?: (message?: string) => void;
  onTaskComplete?: (taskId: string, status: string) => void;
  onTaskCreate?: (date: Date, initialData?: { title: string; description?: string }) => void;
  onQuickApplyRequest?: (prompt: string) => Promise<QuickApplyResult>;
  quickApplyState?: QuickApplyState;
  externalHandshake?: CommandHandshake | null;

}

type RescheduleSuggestion = {
  summary: string;
  prompt: string;
  affectedTasks?: Array<{ id: string; title: string; dueDate: string }>;
  proposalId?: string;
  proposalSource?: 'phenology';
  triggerType?: 'photo_upload' | 'gdd_threshold' | 'harvest_drift_threshold' | 'manual';
  evidenceSummary?: string;
};

type LocalNotice = {
  tone: 'safe' | 'critical';
  message: string;
} | null;

type ChallengeSubmissionState = {
  status: 'idle' | 'submitting' | 'success' | 'error';
  message?: string;
};

type PendingWeatherMove = {
  taskId: string;
  toDate: string;
  taskTitle: string;
  precipProbability: number;
};

const PHENOLOGY_CHALLENGE_REASONS: PhenologyFeedbackReason[] = [
  'field_immature',
  'field_more_advanced',
  'local_weather_differs',
  'labor_constraint',
  'input_error',
  'other',
];

const PHENOLOGY_REASON_LABEL_KEY: Record<PhenologyFeedbackReason, string> = {
  field_immature: 'phenology_reason_field_immature',
  field_more_advanced: 'phenology_reason_field_more_advanced',
  local_weather_differs: 'phenology_reason_local_weather_differs',
  labor_constraint: 'phenology_reason_labor_constraint',
  input_error: 'phenology_reason_input_error',
  other: 'phenology_reason_other',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function toIsoDateString(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return null;
  return parsed.toISOString();
}

function toPhenologyTriggerType(value: unknown): RescheduleSuggestion['triggerType'] {
  return (
    value === 'photo_upload'
    || value === 'gdd_threshold'
    || value === 'harvest_drift_threshold'
    || value === 'manual'
  ) ? value : undefined;
}

function mergeDateKeepingTime(fromIso: string, toDate: string): string {
  const from = new Date(fromIso);
  const [year, month, day] = toDate.split('-').map((part) => Number.parseInt(part, 10));
  const merged = new Date(from);
  merged.setFullYear(year, (month || 1) - 1, day || 1);
  return merged.toISOString();
}

export default function ProjectCalendar({
  startDate,
  targetHarvestDate,
  tasks,
  project,
  onRescheduleRequest,
  onTaskComplete,
  onTaskCreate,
  onQuickApplyRequest,
  quickApplyState,
  externalHandshake,

}: ProjectCalendarProps) {
  const locale = useLocale();
  const t = useTranslations('projects.calendar');
  const router = useRouter();

  const [view, setView] = useState<'month' | 'year'>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showAdvice, setShowAdvice] = useState(false);
  const [rescheduleSuggestion, setRescheduleSuggestion] = useState<RescheduleSuggestion | null>(null);
  const [calendarTasks, setCalendarTasks] = useState<ProjectTaskItem[]>(tasks);
  const [activeDragTaskId, setActiveDragTaskId] = useState<string | null>(null);
  const [pendingWeatherMove, setPendingWeatherMove] = useState<PendingWeatherMove | null>(null);
  const [localNotice, setLocalNotice] = useState<LocalNotice>(null);
  const [challengeExpanded, setChallengeExpanded] = useState(false);
  const [challengeReason, setChallengeReason] = useState<PhenologyFeedbackReason | null>(null);
  const [challengeComment, setChallengeComment] = useState('');
  const [challengeState, setChallengeState] = useState<ChallengeSubmissionState>({ status: 'idle' });

  const quickApplyErrorMessage = useCallback((reason?: string) => {
    if (reason === 'in_flight') return t('quick_apply_error_in_flight');
    if (reason === 'no_plan') return t('quick_apply_error_no_plan');
    if (reason === 'proposal_failed') return t('quick_apply_error_proposal_failed');
    if (reason === 'apply_failed') return t('quick_apply_error_apply_failed');
    if (reason === 'apply_unconfirmed') return t('quick_apply_error_unconfirmed');
    if (reason === 'missing_prompt') return t('quick_apply_error_missing_prompt');
    if (reason === 'chat_unavailable') return t('quick_apply_chat_unavailable');
    return t('quick_apply_error_generic');
  }, [t]);

  useEffect(() => {
    setCalendarTasks(tasks);
  }, [tasks]);

  useEffect(() => {
    if (!localNotice) return;
    const timeout = setTimeout(() => setLocalNotice(null), 3200);
    return () => clearTimeout(timeout);
  }, [localNotice]);

  const taskSignature = tasks.map((task) => `${task.id}:${task.dueDate}:${task.status}`).join('|');

  useEffect(() => {
    if (externalHandshake) {
      setRescheduleSuggestion({
        summary: externalHandshake.summary,
        prompt: externalHandshake.prompt,
        affectedTasks: externalHandshake.affectedTasks.map(task => ({
          id: task.id,
          title: task.title,
          dueDate: task.dueDate,
        })),
        proposalId: externalHandshake.proposalId,
        proposalSource: externalHandshake.proposalSource,
        triggerType: externalHandshake.triggerType,
        evidenceSummary: externalHandshake.evidenceSummary,
      });
      return;
    }

    let isActive = true;
    const fetchSuggestion = async () => {
      try {
        const res = await fetch(`/api/v1/projects/${project.id}/reschedule-suggestion`);
        if (!res.ok) return;
        const data = await res.json();
        if (!isActive) return;
        setRescheduleSuggestion(data.suggestion || null);
      } catch (error) {
        console.warn('Failed to fetch reschedule suggestion:', error);
      }
    };
    fetchSuggestion();
    return () => {
      isActive = false;
    };
  }, [externalHandshake, project.id, taskSignature]);

  const affectedTaskIds = useMemo(
    () => new Set((rescheduleSuggestion?.affectedTasks || []).map((task) => task.id)),
    [rescheduleSuggestion?.affectedTasks]
  );
  const isPhenologySuggestion = rescheduleSuggestion?.proposalSource === 'phenology' && Boolean(rescheduleSuggestion?.proposalId);

  useEffect(() => {
    setChallengeExpanded(false);
    setChallengeReason(null);
    setChallengeComment('');
    setChallengeState({ status: 'idle' });
  }, [rescheduleSuggestion?.proposalId, rescheduleSuggestion?.proposalSource]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handlePrev = () => {
    if (view === 'month') setCurrentDate((prev) => subMonths(prev, 1));
    else setCurrentDate((prev) => subYears(prev, 1));
  };

  const handleNext = () => {
    if (view === 'month') setCurrentDate((prev) => addMonths(prev, 1));
    else setCurrentDate((prev) => addYears(prev, 1));
  };

  const weatherStartDate = format(startOfMonth(currentDate), 'yyyy-MM-dd');
  const weatherEndDate = format(endOfMonth(currentDate), 'yyyy-MM-dd');
  const { data: weatherData } = useWeatherTimeline(
    undefined,
    undefined,
    weatherStartDate,
    weatherEndDate,
    {
      projectId: project.id,
      disabled: view !== 'month',
    },
  );

  const handleTaskMove = useCallback(async ({ taskId, toDate }: TaskMovePayload) => {
    const movingTask = calendarTasks.find((task) => task.id === taskId);
    if (!movingTask) return;

    const originalTasks = calendarTasks;
    const mergedDueAt = mergeDateKeepingTime(movingTask.dueDate, toDate);
    setCalendarTasks((prev) => prev.map((task) => (
      task.id === taskId
        ? { ...task, dueDate: mergedDueAt }
        : task
    )));

    try {
      const idempotencyKey = `task-move:${taskId}:${Date.now()}`;
      const response = await fetch(`/api/v1/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
          'X-Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({ dueAt: mergedDueAt }),
      });

      if (!response.ok) {
        throw new Error(t('task_move_failed'));
      }

      setLocalNotice({
        tone: 'safe',
        message: t('task_moved', { title: movingTask.title, date: format(new Date(mergedDueAt), 'M/d') }),
      });
      router.refresh();
    } catch (error) {
      console.error('Failed to move task:', error);
      setCalendarTasks(originalTasks);
      setLocalNotice({
        tone: 'critical',
        message: t('task_move_failed'),
      });
    }
  }, [calendarTasks, router, t]);

  const handleDragStart = (event: DragStartEvent) => {
    const taskId = event.active.data.current?.taskId as string | undefined;
    setActiveDragTaskId(taskId || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragTaskId(null);
    const taskId = event.active.data.current?.taskId as string | undefined;
    const overId = String(event.over?.id || '');
    if (!taskId || !overId.startsWith('day:')) return;

    const toDate = overId.replace(/^day:/, '');
    const fromDate = event.active.data.current?.fromDate as string | undefined;
    if (!toDate || (fromDate && fromDate === toDate)) return;

    const targetTask = calendarTasks.find((task) => task.id === taskId);
    const weatherDay = weatherData[toDate];
    if (
      targetTask
      && isRainRiskDay(weatherDay)
      && isWeatherSensitiveTask({ title: targetTask.title, description: targetTask.description })
    ) {
      setPendingWeatherMove({
        taskId,
        toDate,
        taskTitle: targetTask.title,
        precipProbability: weatherDay?.precipProbability || 0,
      });
      return;
    }

    void handleTaskMove({ taskId, toDate });
  };

  const handleCancelWeatherMove = useCallback(() => {
    setPendingWeatherMove(null);
  }, []);

  const handleConfirmWeatherMove = useCallback(() => {
    if (!pendingWeatherMove) return;
    const movePayload: TaskMovePayload = {
      taskId: pendingWeatherMove.taskId,
      toDate: pendingWeatherMove.toDate,
    };
    setPendingWeatherMove(null);
    void handleTaskMove(movePayload);
  }, [handleTaskMove, pendingWeatherMove]);

  const handleQuickApply = async () => {
    if (!rescheduleSuggestion?.prompt || !onQuickApplyRequest) return;
    const result = await onQuickApplyRequest(rescheduleSuggestion.prompt);
    if (!result.applied && result.reason) {
      setLocalNotice({
        tone: 'critical',
        message: quickApplyErrorMessage(result.reason),
      });
    }
  };

  const handlePhenologyChallengeSubmit = useCallback(async () => {
    if (!rescheduleSuggestion?.proposalId || !challengeReason) return;
    setChallengeState({ status: 'submitting' });

    try {
      const response = await fetch(`/api/v1/projects/${project.id}/phenology/challenge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposalId: rescheduleSuggestion.proposalId,
          reasonCode: challengeReason,
          comment: challengeComment.trim() || undefined,
        }),
      });

      const payloadRaw = await response.json().catch(() => ({}));
      const payload = isRecord(payloadRaw) ? payloadRaw : {};
      if (!response.ok) {
        const message = typeof payload.message === 'string'
          ? payload.message
          : typeof payload.error === 'string'
            ? payload.error
            : t('phenology_challenge_error');
        throw new Error(message);
      }

      const revisedGenerated = payload.revisedProposalGenerated === true;
      const revisedPlan = isRecord(payload.plan) ? payload.plan : null;
      const revisedPlanItems = revisedPlan && Array.isArray(revisedPlan.items) ? revisedPlan.items : [];
      if (revisedGenerated && revisedPlan) {
        const affectedTasks = revisedPlanItems
          .map((item) => {
            if (!isRecord(item)) return null;
            const id = typeof item.id === 'string' && item.id.trim()
              ? item.id
              : null;
            const title = typeof item.title === 'string' && item.title.trim()
              ? item.title
              : id;
            const dueDate = toIsoDateString(item.to) || toIsoDateString(item.dueDate);
            if (!id || !title || !dueDate) return null;
            return { id, title, dueDate };
          })
          .filter((task): task is { id: string; title: string; dueDate: string } => Boolean(task));

        const revisedProposalId = typeof payload.proposalId === 'string'
          ? payload.proposalId
          : (typeof revisedPlan.proposalId === 'string' ? revisedPlan.proposalId : rescheduleSuggestion.proposalId);
        const revisedEvidence = typeof revisedPlan.evidenceSummary === 'string'
          ? revisedPlan.evidenceSummary
          : rescheduleSuggestion.evidenceSummary;
        const revisedTriggerType = toPhenologyTriggerType(revisedPlan.triggerType) || rescheduleSuggestion.triggerType;
        const revisedSummary = revisedEvidence
          || (typeof payload.revisedMessage === 'string' ? payload.revisedMessage : rescheduleSuggestion.summary);

        setRescheduleSuggestion((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            summary: revisedSummary,
            affectedTasks: affectedTasks.length > 0 ? affectedTasks : prev.affectedTasks,
            proposalId: revisedProposalId,
            proposalSource: 'phenology',
            triggerType: revisedTriggerType,
            evidenceSummary: revisedEvidence,
          };
        });
      }

      const successMessage = revisedGenerated
        ? t('phenology_challenge_success_revised')
        : t('phenology_challenge_success');
      setChallengeState({ status: 'success', message: successMessage });
      setLocalNotice({ tone: 'safe', message: successMessage });
      setChallengeExpanded(false);
      setChallengeReason(null);
      setChallengeComment('');
    } catch (error) {
      const message = error instanceof Error && error.message
        ? error.message
        : t('phenology_challenge_error');
      setChallengeState({ status: 'error', message });
      setLocalNotice({ tone: 'critical', message });
    }
  }, [challengeComment, challengeReason, project.id, rescheduleSuggestion?.proposalId, t]);

  const calendarLocale = locale === 'ja' ? 'ja-JP' : locale;
  const monthLabelFormatter = useMemo(
    () => new Intl.DateTimeFormat(calendarLocale, { year: 'numeric', month: 'long' }),
    [calendarLocale]
  );
  const yearLabelFormatter = useMemo(
    () => new Intl.DateTimeFormat(calendarLocale, { year: 'numeric' }),
    [calendarLocale]
  );
  const calendarHeaderLabel = view === 'month'
    ? monthLabelFormatter.format(currentDate)
    : yearLabelFormatter.format(currentDate);

  const selectedQuickApplyText = quickApplyState?.status === 'running'
    ? t('quick_apply_running')
    : quickApplyState?.status === 'success'
      ? quickApplyState.reason || t('quick_apply_success')
      : quickApplyState?.status === 'error'
        ? quickApplyState.reason || t('quick_apply_error_generic')
        : null;

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-3 sm:p-4">
      {rescheduleSuggestion ? (
        <section className="surface-base border-brand-waterline/30 p-3" data-testid="calendar-handshake-rail">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{t('handshake_title')}</p>
              <p className="mt-0.5 text-sm font-semibold text-foreground" data-testid="calendar-handshake-summary">
                {rescheduleSuggestion.summary}
              </p>
              <p className="text-xs text-muted-foreground" data-testid="calendar-handshake-affected">
                {t('handshake_affected', { count: rescheduleSuggestion.affectedTasks?.length || 0 })}
              </p>
              {isPhenologySuggestion ? (
                <p className="mt-1 inline-flex rounded-full border border-brand-seedling/40 bg-brand-seedling/10 px-2 py-0.5 text-[11px] font-semibold text-brand-seedling">
                  {t('phenology_badge')}
                </p>
              ) : null}
              {rescheduleSuggestion.evidenceSummary ? (
                <p className="mt-1 text-xs text-muted-foreground" data-testid="calendar-handshake-evidence">
                  {t('phenology_evidence_label')}: {rescheduleSuggestion.evidenceSummary}
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => onRescheduleRequest?.(rescheduleSuggestion.prompt)}
                className="touch-target rounded-lg border border-border bg-secondary px-3 py-2 text-xs font-semibold text-secondary-foreground hover:bg-secondary/75"
                data-testid="calendar-handshake-preview"
              >
                {t('handshake_preview')}
              </button>
              <button
                type="button"
                onClick={handleQuickApply}
                disabled={!onQuickApplyRequest || quickApplyState?.status === 'running'}
                className="touch-target rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-55"
                data-testid="calendar-handshake-apply"
              >
                {quickApplyState?.status === 'running' ? t('handshake_apply_running') : t('handshake_apply')}
              </button>
              {isPhenologySuggestion ? (
                <button
                  type="button"
                  onClick={() => {
                    setChallengeExpanded(prev => !prev);
                    setChallengeState({ status: 'idle' });
                  }}
                  className="touch-target rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-100"
                  data-testid="calendar-handshake-challenge"
                >
                  {challengeExpanded ? t('phenology_challenge_hide') : t('phenology_challenge_show')}
                </button>
              ) : null}
            </div>
          </div>
          {selectedQuickApplyText ? (
            <p className={`mt-2 text-xs ${quickApplyState?.status === 'error' ? 'text-destructive' : 'text-muted-foreground'}`}>
              {selectedQuickApplyText}
            </p>
          ) : null}
          {isPhenologySuggestion && challengeExpanded ? (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50/60 p-3" data-testid="calendar-phenology-challenge-panel">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-800">
                {t('phenology_challenge_title')}
              </p>
              <p className="mt-1 text-xs text-amber-900">
                {t('phenology_challenge_hint')}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {PHENOLOGY_CHALLENGE_REASONS.map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setChallengeReason(reason)}
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${
                      challengeReason === reason
                        ? 'border-amber-500 bg-amber-200 text-amber-900'
                        : 'border-amber-300 bg-white text-amber-800 hover:bg-amber-100'
                    }`}
                    data-testid={`calendar-phenology-reason-${reason}`}
                  >
                    {t(PHENOLOGY_REASON_LABEL_KEY[reason])}
                  </button>
                ))}
              </div>
              <label className="mt-2 block text-[11px] font-medium text-amber-900">
                {t('phenology_comment_label')}
                <textarea
                  value={challengeComment}
                  onChange={(event) => setChallengeComment(event.target.value)}
                  placeholder={t('phenology_comment_placeholder')}
                  rows={2}
                  maxLength={800}
                  className="mt-1 w-full rounded-md border border-amber-300 bg-white px-2 py-1.5 text-xs text-foreground outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                  data-testid="calendar-phenology-comment"
                />
              </label>
              <div className="mt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setChallengeExpanded(false);
                    setChallengeState({ status: 'idle' });
                  }}
                  className="rounded-md border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100"
                >
                  {t('phenology_challenge_cancel')}
                </button>
                <button
                  type="button"
                  onClick={handlePhenologyChallengeSubmit}
                  disabled={!challengeReason || challengeState.status === 'submitting'}
                  className="rounded-md bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-800 disabled:opacity-55"
                  data-testid="calendar-phenology-submit"
                >
                  {challengeState.status === 'submitting'
                    ? t('phenology_challenge_submitting')
                    : t('phenology_challenge_submit')}
                </button>
              </div>
              {challengeState.status === 'error' || challengeState.status === 'success' ? (
                <p className={`mt-2 text-xs ${challengeState.status === 'error' ? 'text-destructive' : 'text-emerald-700'}`}>
                  {challengeState.message}
                </p>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}

      {localNotice ? (
        <p className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${localNotice.tone === 'safe' ? 'status-safe' : 'status-critical'}`}>
          {localNotice.message}
        </p>
      ) : null}

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
          <section className="surface-raised flex min-h-0 flex-col overflow-hidden">
            <div className="grid grid-cols-12 items-center border-b border-border px-3 py-2">
              <div className="col-span-4 flex justify-start">
                <div className="rounded-lg border border-border bg-secondary p-0.5">
                  <button
                    type="button"
                    onClick={() => setView('month')}
                    className={`rounded-md px-2 py-1 text-[11px] font-semibold transition ${view === 'month' ? 'bg-card text-foreground shadow-lift1' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    {t('view_month')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setView('year')}
                    className={`rounded-md px-2 py-1 text-[11px] font-semibold transition ${view === 'year' ? 'bg-card text-foreground shadow-lift1' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    {t('view_year')}
                  </button>
                </div>
              </div>

              <div className="col-span-4 flex items-center justify-center gap-1">
                <button type="button" onClick={handlePrev} className="touch-target rounded-full p-1 text-muted-foreground hover:bg-secondary hover:text-foreground">
                  <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                </button>
                <h2 className="min-w-[104px] text-center text-sm font-semibold text-foreground">{calendarHeaderLabel}</h2>
                <button type="button" onClick={handleNext} className="touch-target rounded-full p-1 text-muted-foreground hover:bg-secondary hover:text-foreground">
                  <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                </button>
              </div>

              <div className="col-span-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => onRescheduleRequest?.()}
                  className="touch-target inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1.5 text-[11px] font-semibold text-brand-seedling hover:bg-secondary"
                >
                  <span className="material-symbols-outlined text-[16px]">smart_toy</span>
                  <span className="hidden sm:inline">{t('ask_ai_reschedule')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowAdvice(true)}
                  className="touch-target inline-flex h-[36px] w-[36px] items-center justify-center rounded-full border border-border bg-card text-foreground hover:bg-secondary"
                  title={t('view_insights')}
                >
                  <span className="material-symbols-outlined text-[18px]">lightbulb</span>
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1">
              {view === 'month' ? (
                <MonthGrid
                  currentDate={currentDate}
                  selectedDate={selectedDate}
                  onSelectDate={setSelectedDate}
                  tasks={calendarTasks}
                  weatherData={weatherData}
                  startDate={startDate}
                  targetHarvestDate={targetHarvestDate}
                  activeDragTaskId={activeDragTaskId}
                  affectedTaskIds={affectedTaskIds}
                />
              ) : (
                <ProjectYearView
                  startDate={startDate}
                  targetHarvestDate={targetHarvestDate}
                  tasks={calendarTasks}
                />
              )}
            </div>
          </section>

          <div className="min-h-0">
            <TaskSidePanel
              projectId={project.id}
              selectedDate={selectedDate}
              tasks={calendarTasks}
              affectedTasks={rescheduleSuggestion?.affectedTasks || []}
              onAddTask={onTaskCreate}
              onTaskComplete={(taskId, status) => {
                setCalendarTasks((prev) => prev.map((task) => (
                  task.id === taskId ? { ...task, status } : task
                )));
                onTaskComplete?.(taskId, status);
              }}
            />
          </div>
        </div>
      </DndContext>

      {pendingWeatherMove ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/35 px-4"
          role="dialog"
          aria-modal="true"
          data-testid="weather-drop-warning-dialog"
        >
          <div className="surface-overlay w-full max-w-md p-4 sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-destructive">
              {t('weather_drop_warning_title')}
            </p>
            <p className="mt-2 text-sm text-foreground" data-testid="weather-drop-warning-message">
              {t('weather_drop_warning_body', {
                probability: Math.round(pendingWeatherMove.precipProbability),
                task: pendingWeatherMove.taskTitle,
              })}
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={handleCancelWeatherMove}
                className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground hover:bg-secondary"
                data-testid="weather-drop-warning-cancel"
              >
                {t('weather_drop_warning_cancel')}
              </button>
              <button
                type="button"
                onClick={handleConfirmWeatherMove}
                className="rounded-lg bg-destructive px-3 py-2 text-xs font-semibold text-destructive-foreground hover:opacity-90"
                data-testid="weather-drop-warning-confirm"
              >
                {t('weather_drop_warning_confirm')}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showAdvice ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4 backdrop-blur-sm"
          onClick={() => setShowAdvice(false)}
        >
          <div className="surface-overlay max-h-[86vh] w-full max-w-3xl overflow-y-auto p-0" onClick={(event) => event.stopPropagation()}>
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card/95 px-4 py-3 backdrop-blur">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <span className="material-symbols-outlined text-brand-seedling">auto_awesome</span>
                {t('ai_insights_title')}
              </h3>
              <button
                type="button"
                onClick={() => setShowAdvice(false)}
                className="touch-target rounded-full p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <div className="p-4">
              <ProjectInsightsPanel
                project={{
                  id: project.id,
                  crop: project.crop,
                  stage: project.currentStage,
                }}
                onAskAI={() => {
                  setShowAdvice(false);
                  onRescheduleRequest?.();
                }}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
