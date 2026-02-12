'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { format, isSameDay } from 'date-fns';
import TaskDetailModal from '../TaskDetailModal';
import type { ProjectTaskItem } from '@/types/project-cockpit';

interface TaskSidePanelProps {
  selectedDate: Date;
  tasks: ProjectTaskItem[];
  affectedTasks?: Array<{ id: string; title: string; dueDate: string }>;
  onAddTask?: (date: Date) => void;
  onTaskComplete?: (taskId: string, status: string) => void;
}

type ForecastDay = {
  date: string;
  temperature: { min: number; max: number };
  condition: string;
  icon?: string;
};

function DraggableTaskCard({
  task,
  onToggleComplete,
  onOpen,
}: {
  task: ProjectTaskItem;
  onToggleComplete: () => void;
  onOpen: () => void;
}) {
  const t = useTranslations('projects.calendar');
  const dateKey = format(new Date(task.dueDate), 'yyyy-MM-dd');
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `task:panel:${task.id}`,
    data: {
      taskId: task.id,
      fromDate: dateKey,
      source: 'panel',
    },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  const statusClass = task.status === 'completed'
    ? 'status-safe'
    : task.priority === 'high'
      ? 'status-critical'
      : 'status-watch';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-lg border border-border bg-card p-3 transition ${isDragging ? 'shadow-lift1 opacity-65' : 'hover:border-brand-seedling/45'}`}
    >
      <div className="mb-2 flex items-start gap-2">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onToggleComplete();
          }}
          className={`mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full border text-[11px] font-bold ${
            task.status === 'completed'
              ? 'border-brand-seedling bg-brand-seedling text-primary-foreground'
              : 'border-border bg-secondary text-muted-foreground hover:border-brand-seedling hover:text-brand-seedling'
          }`}
        >
          {task.status === 'completed' ? '✓' : ''}
        </button>

        <button
          type="button"
          onClick={onOpen}
          className={`min-w-0 flex-1 text-left text-sm font-medium ${task.status === 'completed' ? 'text-muted-foreground line-through' : 'text-foreground'}`}
        >
          {task.title}
        </button>
      </div>

      {task.description ? (
        <p className="mb-2 line-clamp-2 text-xs text-muted-foreground">{task.description}</p>
      ) : null}

      <div className="flex items-center justify-between gap-2">
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusClass}`}>
          {task.status === 'completed' ? t('task_completed') : t('task_pending')}
        </span>
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="touch-target rounded-md border border-border bg-secondary px-2 py-1 text-[10px] font-semibold text-secondary-foreground hover:bg-secondary/75"
          aria-label={t('drag_task')}
        >
          {t('drag_task')}
        </button>
      </div>
    </div>
  );
}

export default function TaskSidePanel({
  selectedDate,
  tasks,
  affectedTasks = [],
  onAddTask,
  onTaskComplete,
}: TaskSidePanelProps) {
  const locale = useLocale();
  const t = useTranslations('projects.calendar');
  const tProject = useTranslations('projects');

  const selectedTasks = tasks.filter((task) => isSameDay(new Date(task.dueDate), selectedDate));
  const [forecast, setForecast] = useState<ForecastDay[]>([]);
  const [selectedTask, setSelectedTask] = useState<ProjectTaskItem | null>(null);

  useEffect(() => {
    const loadWeather = async () => {
      try {
        const res = await fetch('/api/weather', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json().catch(() => ({}));
        if (Array.isArray(data?.forecast)) setForecast(data.forecast as ForecastDay[]);
      } catch {
        // ignore weather failures in side panel
      }
    };
    void loadWeather();
  }, []);

  const forecastForSelectedDate = useMemo(() => {
    const key = format(selectedDate, 'yyyy-MM-dd');
    return forecast.find((day) => day.date === key);
  }, [forecast, selectedDate]);

  const selectedDateLabel = useMemo(() => (
    new Intl.DateTimeFormat(locale === 'ja' ? 'ja-JP' : locale, {
      month: 'numeric',
      day: 'numeric',
      weekday: 'short',
    }).format(selectedDate)
  ), [locale, selectedDate]);

  return (
    <>
      <div className="surface-base flex h-full min-h-0 flex-col">
        <div className="border-b border-border px-4 py-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="text-base font-semibold text-foreground">
              {selectedDateLabel}
            </h3>
            {forecastForSelectedDate ? (
              <span className="rounded-full border border-border bg-secondary px-2 py-1 text-xs font-semibold text-secondary-foreground">
                {Math.round(forecastForSelectedDate.temperature.max)}° / {Math.round(forecastForSelectedDate.temperature.min)}°
              </span>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">{t('tasks_for_date')}</p>
        </div>

        {affectedTasks.length > 0 ? (
          <div className="border-b border-border px-4 py-3">
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">{t('affected_tasks_title')}</p>
            <ul className="space-y-1">
              {affectedTasks.slice(0, 3).map((task) => (
                <li key={task.id} className="truncate text-xs text-foreground">
                  • {task.title}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="mobile-scroll flex-1 space-y-2 overflow-y-auto p-4">
          {selectedTasks.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
              {t('no_tasks_for_date')}
            </div>
          ) : (
            selectedTasks.map((task) => (
              <DraggableTaskCard
                key={task.id}
                task={task}
                onOpen={() => setSelectedTask(task)}
                onToggleComplete={() => onTaskComplete?.(task.id, task.status === 'completed' ? 'pending' : 'completed')}
              />
            ))
          )}

          <button
            type="button"
            className="touch-target w-full rounded-lg border-2 border-dashed border-border bg-secondary/35 px-3 py-3 text-sm font-semibold text-muted-foreground transition hover:border-brand-seedling hover:text-brand-seedling"
            onClick={() => onAddTask ? onAddTask(selectedDate) : alert(tProject('add_task_alert'))}
          >
            {t('add_memo')}
          </button>
        </div>
      </div>

      <TaskDetailModal
        isOpen={Boolean(selectedTask)}
        onClose={() => setSelectedTask(null)}
        task={selectedTask || undefined}
      />
    </>
  );
}
