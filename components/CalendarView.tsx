'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfToday,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfToday,
  startOfWeek,
  endOfWeek,
  subMonths,
} from 'date-fns';
import {
  DndContext,
  type DragEndEvent,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  DragOverEvent,
} from '@dnd-kit/core';
import { motion, AnimatePresence } from 'framer-motion';
import { differenceInDays } from 'date-fns';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import TrackedEventLink from './TrackedEventLink';
import { toastError, toastSuccess } from '@/lib/feedback';
import { useWeatherTimeline } from '@/hooks/useWeatherTimeline';
import {
  getWeatherDayRisk,
  isRainRiskDay,
  isWeatherSensitiveTask,
  weatherIconForDay,
  type WeatherTimelineDayData,
} from '@/lib/weather-timeline';
import type { FarmerUiMode } from '@/types/farmer-ui-mode';
import type {
  CalendarFilterKey,
  CalendarOpsSnapshot,
  CalendarReschedulePayload,
  CalendarRiskTone,
  StandaloneCalendarTask,
} from '@/types/standalone-calendar';

const FILTER_KEYS: CalendarFilterKey[] = ['all', 'overdue', 'today', 'next48h'];

type CalendarViewProps = {
  mode: FarmerUiMode;
  locale: string;
  tasks: StandaloneCalendarTask[];
  initialDate?: string;
  initialFilter?: CalendarFilterKey;
  initialProjectId?: string;
};

type MoveTaskOptions = {
  silent?: boolean;
  refresh?: boolean;
};

type PendingWeatherMove = {
  taskId: string;
  toDate: string;
  taskTitle: string;
  precipProbability: number;
};

function parseDate(value?: string): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed : null;
}

function dateKey(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

function toEpoch(value?: string): number {
  if (!value) return Number.POSITIVE_INFINITY;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
}

function normalizeFilter(value?: string): CalendarFilterKey {
  if (!value) return 'all';
  return FILTER_KEYS.includes(value as CalendarFilterKey) ? (value as CalendarFilterKey) : 'all';
}

function mergeDateKeepingTime(fromIso: string, toDateKey: string): string {
  const from = parseDate(fromIso);
  const [yearPart, monthPart, dayPart] = toDateKey.split('-').map((part) => Number.parseInt(part, 10));

  const safe = from ? new Date(from) : new Date();
  safe.setFullYear(yearPart || safe.getFullYear(), (monthPart || 1) - 1, dayPart || 1);

  return safe.toISOString();
}

function buildRiskTone(overdueCount: number, dueNext48hCount: number): CalendarRiskTone {
  if (overdueCount >= 2 || dueNext48hCount >= 7) return 'critical';
  if (overdueCount >= 1 || dueNext48hCount >= 4) return 'warning';
  if (dueNext48hCount > 0) return 'watch';
  return 'safe';
}

function riskBadgeClass(tone: CalendarRiskTone): string {
  if (tone === 'critical') return 'status-critical';
  if (tone === 'warning') return 'status-warning';
  if (tone === 'watch') return 'status-watch';
  return 'status-safe';
}

function inFilterRange(task: StandaloneCalendarTask, filter: CalendarFilterKey): boolean {
  const dueEpoch = toEpoch(task.dueAt);
  if (!Number.isFinite(dueEpoch)) return false;

  const todayStart = startOfToday().getTime();
  const todayEnd = endOfToday().getTime();
  const next48hEnd = Date.now() + 48 * 60 * 60 * 1000;

  if (filter === 'overdue') return dueEpoch < todayStart;
  if (filter === 'today') return dueEpoch >= todayStart && dueEpoch <= todayEnd;
  if (filter === 'next48h') return dueEpoch > todayEnd && dueEpoch <= next48hEnd;
  return true;
}

function taskPriorityClass(priority?: string): string {
  if (priority === 'high') return 'status-critical';
  if (priority === 'medium') return 'status-watch';
  return 'status-safe';
}

function dateLabel(date: Date, locale: string): string {
  return format(date, locale === 'ja' ? 'yyyy年M月d日' : 'MMM d, yyyy');
}

function monthLabel(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale === 'ja' ? 'ja-JP' : locale, {
    year: 'numeric',
    month: 'long',
  }).format(date);
}

function timeLabel(raw: string, locale: string, fallback: string): string {
  const parsed = parseDate(raw);
  if (!parsed) return fallback;
  return new Intl.DateTimeFormat(locale === 'ja' ? 'ja-JP' : locale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(parsed);
}

function DayTaskChip({
  task,
  maxTitle,
  isDownstream,
}: {
  task: StandaloneCalendarTask;
  maxTitle: number;
  isDownstream?: boolean;
}) {
  const parsed = parseDate(task.dueAt);
  const fromDate = parsed ? dateKey(parsed) : '';
  const draggableId = `task:standalone:${task.id}`;

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: draggableId,
    data: {
      taskId: task.id,
      fromDate,
      source: 'standalone-calendar',
    },
  });

  return (
    <motion.button
      type="button"
      layout
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      {...attributes}
      {...listeners}
      data-testid="scheduled-item"
      className={`w-full truncate rounded-md border px-1.5 py-0.5 text-left text-[10px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 ${task.status === 'completed'
        ? 'border-border bg-secondary text-muted-foreground line-through'
        : 'border-border/90 bg-card text-foreground hover:border-brand-seedling/50'
        } ${isDragging ? 'opacity-65 shadow-lift1' : ''} ${isDownstream ? 'border-brand-waterline/60 ring-1 ring-brand-waterline/20' : ''}`}
      title={task.title}
    >
      {task.title.length > maxTitle ? `${task.title.slice(0, maxTitle - 1)}…` : task.title}
    </motion.button>
  );
}

function DayCell({
  day,
  currentMonth,
  selectedDate,
  onSelectDate,
  dayTasks,
  weatherDay,
  activeDragTaskId,
  downstreamIds,
  maxChips,
  t,
}: {
  day: Date;
  currentMonth: Date;
  selectedDate: Date;
  onSelectDate: (day: Date) => void;
  dayTasks: StandaloneCalendarTask[];
  weatherDay?: WeatherTimelineDayData;
  activeDragTaskId: string | null;
  downstreamIds: Set<string>;
  maxChips: number;
  t: (key: string, values?: Record<string, string | number>) => string;
}) {
  const dayKey = dateKey(day);
  const isSelected = isSameDay(day, selectedDate);
  const { setNodeRef, isOver } = useDroppable({
    id: `day:${dayKey}`,
    data: { date: dayKey },
  });
  const weatherRisk = getWeatherDayRisk(weatherDay);
  const weatherIcon = weatherIconForDay(weatherDay);
  const hasRainRisk = weatherRisk === 'rainy';
  const dragHintClass = hasRainRisk ? 'text-destructive' : 'text-brand-seedling';
  const dragRingClass = activeDragTaskId && isOver
    ? hasRainRisk
      ? 'bg-destructive/10 ring-2 ring-destructive/50'
      : 'bg-brand-seedling/15 ring-2 ring-brand-seedling/55'
    : '';
  const weatherOverlayClass = hasRainRisk
    ? 'bg-brand-waterline/20 bg-[repeating-linear-gradient(-45deg,rgba(14,116,144,0.18)_0,rgba(14,116,144,0.18)_6px,rgba(255,255,255,0)_6px,rgba(255,255,255,0)_12px)]'
    : weatherRisk === 'watch'
      ? 'bg-brand-waterline/10'
      : '';

  return (
    <div
      ref={setNodeRef}
      data-testid="calendar-date"
      data-date={dayKey}
      data-weather-risk={weatherRisk}
      data-weather-precip={weatherDay ? Math.round(weatherDay.precipProbability) : undefined}
      onClick={() => onSelectDate(day)}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelectDate(day);
        }
      }}
      className={`calendar-date flex min-h-[108px] flex-col border-b border-r border-border/70 p-1.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${isSelected
        ? 'selected bg-brand-waterline/10 ring-1 ring-inset ring-brand-waterline/55'
        : isSameMonth(day, currentMonth)
          ? 'bg-card hover:bg-secondary/45'
          : 'bg-secondary/25 hover:bg-secondary/45'
        } ${weatherOverlayClass} ${isToday(day) ? 'border-brand-seedling/55' : ''} ${dragRingClass}`}
      aria-label={t('drop_target_label', { date: format(day, 'M/d') })}
    >
      <div className="mb-1 flex items-center justify-between gap-1">
        <span
          className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold ${isSelected
            ? 'bg-brand-waterline text-primary-foreground'
            : isToday(day)
              ? 'bg-brand-seedling/20 text-brand-seedling'
              : 'bg-secondary text-secondary-foreground'
            }`}
        >
          {format(day, 'd')}
        </span>
        <div className="flex items-center gap-1">
          {weatherDay ? (
            <>
              <span className="material-symbols-outlined text-[13px] text-muted-foreground" data-testid="calendar-weather-icon">
                {weatherIcon}
              </span>
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${hasRainRisk ? 'bg-destructive/15 text-destructive' : 'bg-secondary text-muted-foreground'
                }`}>
                {Math.round(weatherDay.precipProbability)}%
              </span>
            </>
          ) : null}
          {dayTasks.length > 0 ? (
            <span className="rounded-full border border-border bg-secondary px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
              {dayTasks.length}
            </span>
          ) : null}
        </div>
      </div>

      <div className="space-y-1">
        {dayTasks.slice(0, maxChips).map((task) => (
          <DayTaskChip
            key={`day-chip-${task.id}`}
            task={task}
            maxTitle={modeBasedChipTitle(maxChips)}
            isDownstream={downstreamIds.has(task.id)}
          />
        ))}

        {dayTasks.length > maxChips ? (
          <p className="truncate text-[10px] font-semibold text-muted-foreground">
            {t('more_tasks', { count: dayTasks.length - maxChips })}
          </p>
        ) : null}

        {activeDragTaskId && isOver ? (
          <p className={`text-[10px] font-semibold ${dragHintClass}`}>
            {hasRainRisk ? t('drop_hint_rain') : t('drop_hint')}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function modeBasedChipTitle(maxChips: number): number {
  return maxChips >= 3 ? 16 : 12;
}

function DayTaskPanel({
  locale,
  selectedDate,
  tasks,
  onComplete,
  onMove,
  t,
}: {
  locale: string;
  selectedDate: Date;
  tasks: StandaloneCalendarTask[];
  onComplete: (taskId: string) => void;
  onMove: (taskId: string, delta: number) => void;
  t: (key: string, values?: Record<string, string | number>) => string;
}) {
  return (
    <div className="h-full min-h-0 overflow-y-auto p-4 sm:p-5">
      <div className="mb-4 border-b border-border pb-3">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{t('day_tasks_heading')}</p>
        <h3 data-testid="date-display" className="mt-1 text-lg font-semibold text-foreground">
          {dateLabel(selectedDate, locale)}
        </h3>
      </div>

      {tasks.length === 0 ? (
        <div className="surface-base p-4">
          <p className="text-sm font-semibold text-foreground">{t('no_tasks_for_day_title')}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t('no_tasks_for_day_description')}</p>
        </div>
      ) : (
        <ul data-testid="activity-timeline" className="space-y-2.5">
          {tasks.map((task) => {
            const iso = parseDate(task.dueAt)?.toISOString() || '';
            return (
              <li key={task.id} data-testid="timeline-item" className="surface-base p-3">
                <div data-testid="scheduled-item" className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{task.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{task.projectName || t('unassigned_project')}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <span data-testid="time-display" className="rounded-full border border-border bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground">
                        {timeLabel(task.dueAt, locale, t('time_unknown'))}
                      </span>
                      {task.priority ? (
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${taskPriorityClass(task.priority)}`}>
                          {t(`priority_${task.priority}`)}
                        </span>
                      ) : null}
                    </div>
                    <span data-testid="activity-time" className="sr-only">{iso}</span>
                    {task.projectId ? (
                      <Link
                        href={`/${locale}/projects/${task.projectId}`}
                        className="mt-2 inline-flex items-center text-xs font-semibold text-brand-waterline hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {t('open_project')}
                      </Link>
                    ) : null}
                  </div>

                  <div className="ml-2 flex shrink-0 flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => onMove(task.id, -1)}
                      className="touch-target inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-secondary text-muted-foreground hover:text-foreground"
                      aria-label={t('move_prev_day')}
                    >
                      <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onMove(task.id, 1)}
                      className="touch-target inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-secondary text-muted-foreground hover:text-foreground"
                      aria-label={t('move_next_day')}
                    >
                      <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onComplete(task.id)}
                      className="touch-target rounded-md bg-primary px-2 py-1 text-[11px] font-semibold text-primary-foreground hover:opacity-90"
                    >
                      {t('done')}
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function CalendarView({
  mode,
  locale,
  tasks,
  initialDate,
  initialFilter,
  initialProjectId,
}: CalendarViewProps) {
  const t = useTranslations('workflow.calendar');
  const tw = useTranslations('workflow');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const resolvedInitialDate = parseDate(initialDate) || new Date();
  const [currentDate, setCurrentDate] = useState<Date>(startOfMonth(resolvedInitialDate));
  const [selectedDate, setSelectedDate] = useState<Date>(resolvedInitialDate);
  const [activeFilter, setActiveFilter] = useState<CalendarFilterKey>(normalizeFilter(initialFilter));
  const [projectFilter, setProjectFilter] = useState(initialProjectId || 'all');
  const [localTasks, setLocalTasks] = useState<StandaloneCalendarTask[]>(tasks);
  const [activeDragTaskId, setActiveDragTaskId] = useState<string | null>(null);
  const [dragDeltaDays, setDragDeltaDays] = useState(0);
  const [downstreamIds, setDownstreamIds] = useState<Set<string>>(new Set());
  const [pendingCascade, setPendingCascade] = useState<{
    triggerTaskId: string;
    toDate: string;
    proposals: Array<{ id: string; title: string; dueDate: string }>;
    summary: string;
  } | null>(null);
  const [pendingWeatherMove, setPendingWeatherMove] = useState<PendingWeatherMove | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [applyState, setApplyState] = useState<{ status: 'idle' | 'running' | 'success' | 'error'; message?: string }>({
    status: 'idle',
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);

  const projectOptions = useMemo(() => {
    const mapped = new Map<string, string>();
    for (const task of localTasks) {
      if (!task.projectId) continue;
      mapped.set(task.projectId, task.projectName || task.projectId);
    }
    return Array.from(mapped.entries()).map(([id, name]) => ({ id, name }));
  }, [localTasks]);

  useEffect(() => {
    if (projectFilter === 'all') return;
    if (!projectOptions.some((option) => option.id === projectFilter)) {
      setProjectFilter('all');
    }
  }, [projectFilter, projectOptions]);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());

    const dateValue = dateKey(selectedDate);
    if (params.get('date') !== dateValue) {
      params.set('date', dateValue);
    }

    if (params.get('filter') !== activeFilter) {
      params.set('filter', activeFilter);
    }

    if (projectFilter === 'all') {
      params.delete('project');
    } else if (params.get('project') !== projectFilter) {
      params.set('project', projectFilter);
    }

    const nextQuery = params.toString();
    if (nextQuery !== searchParams.toString()) {
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
    }
  }, [activeFilter, pathname, projectFilter, router, searchParams, selectedDate]);

  const actionableTasks = useMemo(
    () => localTasks.filter((task) => task.status !== 'cancelled' && task.status !== 'completed'),
    [localTasks],
  );

  const projectScopedTasks = useMemo(
    () =>
      projectFilter === 'all'
        ? actionableTasks
        : actionableTasks.filter((task) => task.projectId === projectFilter),
    [actionableTasks, projectFilter],
  );

  const opsSnapshot = useMemo<CalendarOpsSnapshot>(() => {
    const todayStart = startOfToday().getTime();
    const todayEnd = endOfToday().getTime();
    const next48hEnd = Date.now() + 48 * 60 * 60 * 1000;

    const overdueCount = projectScopedTasks.filter((task) => {
      const dueEpoch = toEpoch(task.dueAt);
      return Number.isFinite(dueEpoch) && dueEpoch < todayStart;
    }).length;

    const dueTodayCount = projectScopedTasks.filter((task) => {
      const dueEpoch = toEpoch(task.dueAt);
      return Number.isFinite(dueEpoch) && dueEpoch >= todayStart && dueEpoch <= todayEnd;
    }).length;

    const dueNext48hCount = projectScopedTasks.filter((task) => {
      const dueEpoch = toEpoch(task.dueAt);
      return Number.isFinite(dueEpoch) && dueEpoch > todayEnd && dueEpoch <= next48hEnd;
    }).length;

    return {
      overdueCount,
      dueTodayCount,
      dueNext48hCount,
      risk: buildRiskTone(overdueCount, dueNext48hCount),
    };
  }, [projectScopedTasks]);

  const filterCounts = useMemo(() => {
    const counts: Record<CalendarFilterKey, number> = {
      all: projectScopedTasks.length,
      overdue: 0,
      today: 0,
      next48h: 0,
    };

    for (const task of projectScopedTasks) {
      if (inFilterRange(task, 'overdue')) counts.overdue += 1;
      if (inFilterRange(task, 'today')) counts.today += 1;
      if (inFilterRange(task, 'next48h')) counts.next48h += 1;
    }

    return counts;
  }, [projectScopedTasks]);

  const filteredTasks = useMemo(
    () => projectScopedTasks.filter((task) => inFilterRange(task, activeFilter)),
    [projectScopedTasks, activeFilter],
  );

  const tasksWithSliding = useMemo(() => {
    if (!activeDragTaskId || dragDeltaDays === 0) return projectScopedTasks;

    return projectScopedTasks.map((task) => {
      if (task.id === activeDragTaskId || downstreamIds.has(task.id)) {
        try {
          const nextDate = addDays(new Date(task.dueAt), dragDeltaDays);
          return { ...task, dueAt: nextDate.toISOString() };
        } catch {
          return task;
        }
      }
      return task;
    });
  }, [projectScopedTasks, activeDragTaskId, dragDeltaDays, downstreamIds]);

  const tasksByDay = useMemo(() => {
    const grouped = new Map<string, StandaloneCalendarTask[]>();

    for (const task of tasksWithSliding) {
      if (activeFilter !== 'all' && !inFilterRange(task, activeFilter)) continue;
      const parsed = parseDate(task.dueAt);
      if (!parsed) continue;

      const key = dateKey(parsed);
      const list = grouped.get(key) || [];
      list.push(task);
      grouped.set(key, list);
    }

    for (const [key, list] of grouped.entries()) {
      grouped.set(key, list.sort((left, right) => toEpoch(left.dueAt) - toEpoch(right.dueAt)));
    }

    return grouped;
  }, [tasksWithSliding, activeFilter]);

  const selectedDateKey = dateKey(selectedDate);
  const selectedDayTasks = useMemo(
    () => tasksByDay.get(selectedDateKey) || [],
    [tasksByDay, selectedDateKey],
  );

  const overdueCandidates = useMemo(() => {
    const todayStart = startOfToday().getTime();
    return projectScopedTasks
      .filter((task) => {
        const dueEpoch = toEpoch(task.dueAt);
        if (!Number.isFinite(dueEpoch)) return false;
        return dueEpoch < todayStart && dateKey(new Date(dueEpoch)) !== selectedDateKey;
      })
      .sort((left, right) => toEpoch(left.dueAt) - toEpoch(right.dueAt));
  }, [projectScopedTasks, selectedDateKey]);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
  const weatherStartDate = format(gridStart, 'yyyy-MM-dd');
  const weatherEndDate = format(gridEnd, 'yyyy-MM-dd');
  const { data: weatherTimeline } = useWeatherTimeline(
    undefined,
    undefined,
    weatherStartDate,
    weatherEndDate,
    {
      projectId: projectFilter !== 'all' ? projectFilter : undefined,
    },
  );

  const weekdayLabels = [
    t('weekday_sun'),
    t('weekday_mon'),
    t('weekday_tue'),
    t('weekday_wed'),
    t('weekday_thu'),
    t('weekday_fri'),
    t('weekday_sat'),
  ];

  const monthTitle = monthLabel(currentDate, locale);
  const densitySubtitle = mode === 'veteran_farmer' ? t('subtitle_veteran_farmer') : t('subtitle_new_farmer');

  const buildChatHref = useMemo(() => {
    const topTasks = selectedDayTasks.slice(0, 3).map((task) => task.title).join(', ');
    const prompt = topTasks
      ? t('ai_prompt_with_tasks', { date: selectedDateKey, tasks: topTasks })
      : t('ai_prompt_empty', { date: selectedDateKey });

    const query = new URLSearchParams({
      intent: 'calendar',
      date: selectedDateKey,
      prompt,
    });

    return `/${locale}/chat?${query.toString()}`;
  }, [locale, selectedDateKey, selectedDayTasks, t]);

  const patchTask = useCallback(
    async (taskId: string, payload: Record<string, unknown>, idempotencyKey: string) => {
      const res = await fetch(`/api/v1/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
          'X-Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(t('task_update_failed'));
      }

      return res;
    },
    [t],
  );

  const moveTaskToDate = useCallback(
    async (payload: CalendarReschedulePayload, options: MoveTaskOptions = {}) => {
      const task = localTasks.find((item) => item.id === payload.taskId);
      if (!task) return false;

      const previous = localTasks;
      const nextDueAt = mergeDateKeepingTime(task.dueAt, payload.toDate);
      setLocalTasks((prev) => prev.map((item) => (item.id === payload.taskId ? { ...item, dueAt: nextDueAt } : item)));

      try {
        await patchTask(payload.taskId, { dueAt: nextDueAt }, payload.idempotencyKey);

        if (!options.silent) {
          toastSuccess(t('task_moved_notice', { title: task.title, date: format(new Date(nextDueAt), 'M/d') }));
        }

        if (options.refresh !== false) {
          router.refresh();
        }

        return true;
      } catch {
        setLocalTasks(previous);

        if (!options.silent) {
          toastError(t('reschedule_failed'));
        }

        return false;
      }
    },
    [localTasks, patchTask, router, t],
  );

  const handleCompleteTask = useCallback(
    async (taskId: string) => {
      const target = localTasks.find((task) => task.id === taskId);
      if (!target) return;

      const previous = localTasks;
      setLocalTasks((prev) => prev.filter((task) => task.id !== taskId));

      try {
        await patchTask(taskId, { status: 'completed' }, `calendar-complete:${taskId}:${Date.now()}`);
        toastSuccess(t('task_completed_notice', { task: target.title }));
        router.refresh();
      } catch {
        setLocalTasks(previous);
        toastError(t('task_update_failed'));
      }
    },
    [localTasks, patchTask, router, t],
  );

  const handleMoveByDelta = useCallback(
    (taskId: string, delta: number) => {
      const task = localTasks.find((item) => item.id === taskId);
      if (!task) return;

      const parsed = parseDate(task.dueAt) || selectedDate;
      const nextDate = addDays(parsed, delta);
      void moveTaskToDate({
        taskId,
        toDate: dateKey(nextDate),
        idempotencyKey: `calendar-shift:${taskId}:${Date.now()}:${delta}`,
      });
    },
    [localTasks, moveTaskToDate, selectedDate],
  );

  const handleApplyScheduling = useCallback(async () => {
    if (applyState.status === 'running') return;

    const moveTargets = overdueCandidates.slice(0, mode === 'veteran_farmer' ? 3 : 1);
    if (moveTargets.length === 0) {
      setApplyState({ status: 'error', message: t('ai_apply_empty') });
      return;
    }

    const previous = localTasks;
    setApplyState({ status: 'running', message: t('ai_apply_running') });

    const updates = moveTargets.map((task, index) => ({
      taskId: task.id,
      toDate: selectedDateKey,
      idempotencyKey: `calendar-ai-apply:${task.id}:${Date.now()}:${index}`,
      nextDueAt: mergeDateKeepingTime(task.dueAt, selectedDateKey),
    }));

    setLocalTasks((prev) =>
      prev.map((task) => {
        const update = updates.find((item) => item.taskId === task.id);
        return update ? { ...task, dueAt: update.nextDueAt } : task;
      }),
    );

    try {
      await Promise.all(
        updates.map((update) => patchTask(update.taskId, { dueAt: update.nextDueAt }, update.idempotencyKey)),
      );

      const message = t('ai_apply_success', { count: updates.length });
      setApplyState({ status: 'success', message });
      toastSuccess(message);
      router.refresh();
    } catch {
      setLocalTasks(previous);
      const message = t('ai_apply_error');
      setApplyState({ status: 'error', message });
      toastError(message);
    }
  }, [applyState.status, localTasks, mode, overdueCandidates, patchTask, router, selectedDateKey, t]);

  const handleDaySelect = useCallback(
    (day: Date) => {
      setSelectedDate(day);
      if (!isSameMonth(day, currentDate)) {
        setCurrentDate(startOfMonth(day));
      }

      if (typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches) {
        setSheetOpen(true);
      }
    },
    [currentDate],
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const taskId = event.active.data.current?.taskId as string;
    setActiveDragTaskId(taskId);

    // Find downstream tasks (recursive)
    const downstream = new Set<string>();
    const stack = [taskId];
    while (stack.length > 0) {
      const currentId = stack.pop()!;
      for (const t of localTasks) {
        if (t.dependsOnTaskId === currentId && !downstream.has(t.id)) {
          downstream.add(t.id);
          stack.push(t.id);
        }
      }
    }
    setDownstreamIds(downstream);
  }, [localTasks]);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const overId = String(event.over?.id || '');
    if (!overId.startsWith('day:')) {
      setDragDeltaDays(0);
      return;
    }

    const fromDate = event.active.data.current?.fromDate as string;
    const toDate = overId.replace(/^day:/, '');

    if (fromDate && toDate) {
      setDragDeltaDays(differenceInDays(new Date(toDate), new Date(fromDate)));
    }
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const taskId = event.active.data.current?.taskId as string | undefined;
      const fromDate = event.active.data.current?.fromDate as string | undefined;
      const overId = String(event.over?.id || '');

      setActiveDragTaskId(null);
      setDragDeltaDays(0);
      setDownstreamIds(new Set());

      if (!taskId || !overId.startsWith('day:')) return;

      const toDate = overId.replace(/^day:/, '');
      if (!toDate || (fromDate && fromDate === toDate)) return;

      const targetTask = localTasks.find((task) => task.id === taskId);
      if (!targetTask) return;

      // Check for cascading effect via API preview
      try {
        const res = await fetch(`/api/v1/projects/${targetTask.projectId}/cascade-reschedule`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ triggerTaskId: taskId, toDate, commit: false }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.suggestion && data.suggestion.affectedTasks.length > 1) {
            setPendingCascade({
              triggerTaskId: taskId,
              toDate,
              proposals: data.suggestion.affectedTasks,
              summary: data.suggestion.summary,
            });
            return;
          }
        }
      } catch (err) {
        console.warn('Cascade preview failed, falling back to simple move', err);
      }

      // Simple move or weather check if no complex cascade
      const weatherDay = weatherTimeline[toDate];
      if (
        isRainRiskDay(weatherDay)
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

      void moveTaskToDate({
        taskId,
        toDate,
        idempotencyKey: `calendar-dnd:${taskId}:${Date.now()}`,
      });
    },
    [localTasks, moveTaskToDate, weatherTimeline],
  );

  const handleConfirmCascade = useCallback(async () => {
    if (!pendingCascade) return;
    const { triggerTaskId, toDate } = pendingCascade;
    const task = localTasks.find(t => t.id === triggerTaskId);
    if (!task) return;

    setApplyState({ status: 'running' });
    try {
      const res = await fetch(`/api/v1/projects/${task.projectId}/cascade-reschedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ triggerTaskId, toDate, commit: true }),
      });

      if (!res.ok) throw new Error();

      toastSuccess(tw('calendar.quick_apply_success'));
      setPendingCascade(null);
      setApplyState({ status: 'success' });
      router.refresh();
    } catch {
      toastError(tw('calendar.quick_apply_error_generic'));
      setApplyState({ status: 'idle' });
    }
  }, [localTasks, pendingCascade, router, tw]);

  const handleCancelWeatherMove = useCallback(() => {
    setPendingWeatherMove(null);
  }, []);

  const handleConfirmWeatherMove = useCallback(() => {
    if (!pendingWeatherMove) return;

    const payload: CalendarReschedulePayload = {
      taskId: pendingWeatherMove.taskId,
      toDate: pendingWeatherMove.toDate,
      idempotencyKey: `calendar-dnd-force:${pendingWeatherMove.taskId}:${Date.now()}`,
    };

    setPendingWeatherMove(null);
    void moveTaskToDate(payload);
  }, [moveTaskToDate, pendingWeatherMove]);

  return (
    <div data-testid="calendar-view" className="space-y-3 sm:space-y-4">
      <section className="surface-raised p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {tw('field_operations')}
            </p>
            <h1 className="text-xl font-semibold text-foreground sm:text-2xl">{t('title')}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{densitySubtitle}</p>
          </div>
          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${riskBadgeClass(opsSnapshot.risk)}`}>
            {t('risk_prefix')} {tw(`risk.${opsSnapshot.risk}`)}
          </span>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <div className="surface-base p-3">
            <p className="text-xs text-muted-foreground">{t('ops_overdue')}</p>
            <p className="mt-1 text-lg font-semibold text-foreground">{opsSnapshot.overdueCount}</p>
          </div>
          <div className="surface-base p-3">
            <p className="text-xs text-muted-foreground">{t('ops_today')}</p>
            <p className="mt-1 text-lg font-semibold text-foreground">{opsSnapshot.dueTodayCount}</p>
          </div>
          <div className="surface-base p-3">
            <p className="text-xs text-muted-foreground">{t('ops_next_48h')}</p>
            <p className="mt-1 text-lg font-semibold text-foreground">{opsSnapshot.dueNext48hCount}</p>
          </div>
        </div>
      </section>

      <section className="surface-base p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{t('ai_rail_title')}</p>
            <p className="text-xs text-muted-foreground">
              {selectedDayTasks.length > 0
                ? t('tasks_selected_note', { count: selectedDayTasks.length })
                : t('no_tasks_selected_note')}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <TrackedEventLink
              href={buildChatHref}
              eventName="calendar_context_chat_clicked"
              eventProperties={{
                date: selectedDateKey,
                selectedTaskCount: selectedDayTasks.length,
              }}
              data-testid="calendar-ai-link"
              className="touch-target inline-flex items-center rounded-lg border border-border bg-secondary px-3 py-2 text-xs font-semibold text-secondary-foreground hover:bg-secondary/75"
            >
              {t('ai_preview')}
            </TrackedEventLink>
            <button
              type="button"
              onClick={() => {
                void handleApplyScheduling();
              }}
              disabled={applyState.status === 'running'}
              className="touch-target rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
            >
              {applyState.status === 'running' ? t('ai_apply_running') : t('ai_apply')}
            </button>
          </div>
        </div>
        {applyState.message ? (
          <p
            className={`mt-2 text-xs ${applyState.status === 'error' ? 'text-destructive' : 'text-muted-foreground'
              }`}
          >
            {applyState.message}
          </p>
        ) : null}
      </section>

      <section className="surface-base p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setCurrentDate((prev) => subMonths(prev, 1))}
              className="touch-target rounded-full p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
              aria-label={t('prev_month')}
            >
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>
            <h2 className="min-w-[156px] text-center text-sm font-semibold text-foreground">{monthTitle}</h2>
            <button
              type="button"
              onClick={() => setCurrentDate((prev) => addMonths(prev, 1))}
              className="touch-target rounded-full p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
              aria-label={t('next_month')}
            >
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              const now = new Date();
              setCurrentDate(startOfMonth(now));
              setSelectedDate(now);
            }}
            className="touch-target rounded-full border border-border bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground hover:bg-secondary/75"
          >
            {t('back_to_current_month')}
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {FILTER_KEYS.map((filterKey) => (
            <button
              key={filterKey}
              type="button"
              aria-pressed={activeFilter === filterKey}
              onClick={() => setActiveFilter(filterKey)}
              className={`touch-target rounded-full border px-3 py-1.5 text-xs font-semibold transition ${activeFilter === filterKey
                ? 'border-brand-waterline/60 bg-brand-waterline/15 text-foreground'
                : 'border-border bg-card text-muted-foreground hover:text-foreground'
                }`}
            >
              {t(`filter_${filterKey}`)} ({filterCounts[filterKey]})
            </button>
          ))}

          <div className="ml-auto flex items-center gap-2">
            <label htmlFor="calendar-project-filter" className="text-xs font-medium text-muted-foreground">
              {t('project_filter_label')}
            </label>
            <select
              id="calendar-project-filter"
              value={projectFilter}
              onChange={(event) => setProjectFilter(event.target.value)}
              className="control-inset h-9 rounded-lg px-3 text-xs font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="all">{t('project_filter_all')}</option>
              {projectOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <AnimatePresence>
        {pendingCascade && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="surface-raised fixed bottom-8 left-1/2 z-50 flex w-[90%] max-w-xl -translate-x-1/2 flex-col border-brand-waterline/40 p-4 shadow-lift2 sm:p-5"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
                  <span className="material-symbols-outlined text-brand-waterline text-[18px]">alt_route</span>
                  {t('handshake_title')}
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {pendingCascade.summary}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPendingCascade(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="mt-4 flex max-h-32 flex-col gap-1.5 overflow-y-auto pr-1">
              {pendingCascade.proposals.slice(0, 5).map(p => (
                <div key={p.id} className="flex items-center justify-between rounded bg-secondary/30 px-2 py-1.5 text-[10px]">
                  <span className="font-medium text-foreground">{p.title}</span>
                  <span className="font-mono text-muted-foreground">{p.dueDate}</span>
                </div>
              ))}
              {pendingCascade.proposals.length > 5 && (
                <p className="text-center text-[9px] text-muted-foreground">
                  + {pendingCascade.proposals.length - 5} {t('more_tasks', { count: pendingCascade.proposals.length - 5 })}
                </p>
              )}
            </div>

            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setPendingCascade(null)}
                className="touch-target px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                {t('reschedule_suggestion_cancel')}
              </button>
              <button
                type="button"
                onClick={() => handleConfirmCascade()}
                disabled={applyState.status === 'running'}
                className="touch-target flex items-center gap-2 rounded-lg bg-brand-waterline px-4 py-2 text-xs font-bold text-white shadow-sm hover:brightness-110 disabled:opacity-50"
              >
                {applyState.status === 'running' ? (
                  <>
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                    {t('handshake_apply_running')}
                  </>
                ) : (
                  t('handshake_apply')
                )}
              </button>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
        <div className="grid min-h-0 gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(340px,1fr)]">
          <section className="surface-raised min-h-[560px] overflow-hidden">
            <div className="grid grid-cols-7 border-b border-border bg-secondary/45">
              {weekdayLabels.map((label, index) => (
                <p
                  key={label}
                  className={`py-2 text-center text-[11px] font-semibold ${index === 0 ? 'text-risk-critical' : index === 6 ? 'text-brand-waterline' : 'text-muted-foreground'
                    }`}
                >
                  {label}
                </p>
              ))}
            </div>

            <div className="grid grid-cols-7 auto-rows-fr">
              {days.map((day) => {
                const dayKey = dateKey(day);
                const dayTasks = tasksByDay.get(dayKey) || [];
                return (
                  <DayCell
                    key={day.toISOString()}
                    day={day}
                    currentMonth={currentDate}
                    selectedDate={selectedDate}
                    onSelectDate={handleDaySelect}
                    dayTasks={dayTasks}
                    weatherDay={weatherTimeline[dayKey]}
                    activeDragTaskId={activeDragTaskId}
                    downstreamIds={downstreamIds}
                    maxChips={mode === 'veteran_farmer' ? 3 : 2}
                    t={t}
                  />
                );
              })}
            </div>
          </section>

          <aside className="surface-raised hidden min-h-[560px] lg:block">
            <DayTaskPanel
              locale={locale}
              selectedDate={selectedDate}
              tasks={selectedDayTasks}
              onComplete={handleCompleteTask}
              onMove={handleMoveByDelta}
              t={t}
            />
          </aside>
        </div>
      </DndContext>

      <button
        type="button"
        onClick={() => setSheetOpen(true)}
        className="mobile-btn-secondary lg:hidden"
      >
        {t('mobile_sheet_open')}
      </button>

      {sheetOpen ? (
        <div className="fixed inset-0 z-50 flex items-end lg:hidden" role="dialog" aria-modal="true" aria-label={t('mobile_sheet_title')}>
          <button
            type="button"
            onClick={() => setSheetOpen(false)}
            className="absolute inset-0 bg-black/35"
            aria-label={t('close')}
          />
          <div className="surface-overlay relative z-10 max-h-[82vh] w-full overflow-hidden rounded-b-none rounded-t-2xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <p className="text-sm font-semibold text-foreground">{t('mobile_sheet_title')}</p>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                className="touch-target rounded-full p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
                aria-label={t('close')}
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <DayTaskPanel
              locale={locale}
              selectedDate={selectedDate}
              tasks={selectedDayTasks}
              onComplete={handleCompleteTask}
              onMove={handleMoveByDelta}
              t={t}
            />
          </div>
        </div>
      ) : null}

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
    </div>
  );
}
