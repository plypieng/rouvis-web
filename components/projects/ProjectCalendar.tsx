'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { format, addMonths, subMonths, addYears, subYears } from 'date-fns';
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
import type { ProjectTaskItem, QuickApplyResult, QuickApplyState, TaskMovePayload } from '@/types/project-cockpit';

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
}

type RescheduleSuggestion = {
  summary: string;
  prompt: string;
  affectedTasks?: Array<{ id: string; title: string; dueDate: string }>;
};

type LocalNotice = {
  tone: 'safe' | 'critical';
  message: string;
} | null;

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
  const [localNotice, setLocalNotice] = useState<LocalNotice>(null);

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
  }, [project.id, taskSignature]);

  const affectedTaskIds = useMemo(
    () => new Set((rescheduleSuggestion?.affectedTasks || []).map((task) => task.id)),
    [rescheduleSuggestion?.affectedTasks]
  );

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

    void handleTaskMove({ taskId, toDate });
  };

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
        <section className="surface-base border-brand-waterline/30 p-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{t('handshake_title')}</p>
              <p className="mt-0.5 text-sm font-semibold text-foreground">{rescheduleSuggestion.summary}</p>
              <p className="text-xs text-muted-foreground">
                {t('handshake_affected', { count: rescheduleSuggestion.affectedTasks?.length || 0 })}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => onRescheduleRequest?.(rescheduleSuggestion.prompt)}
                className="touch-target rounded-lg border border-border bg-secondary px-3 py-2 text-xs font-semibold text-secondary-foreground hover:bg-secondary/75"
              >
                {t('handshake_preview')}
              </button>
              <button
                type="button"
                onClick={handleQuickApply}
                disabled={!onQuickApplyRequest || quickApplyState?.status === 'running'}
                className="touch-target rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-55"
              >
                {quickApplyState?.status === 'running' ? t('handshake_apply_running') : t('handshake_apply')}
              </button>
            </div>
          </div>
          {selectedQuickApplyText ? (
            <p className={`mt-2 text-xs ${quickApplyState?.status === 'error' ? 'text-destructive' : 'text-muted-foreground'}`}>
              {selectedQuickApplyText}
            </p>
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
