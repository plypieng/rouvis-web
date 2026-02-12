'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  subMonths,
} from 'date-fns';
import { ModuleBlueprint } from '@/components/workflow/ModuleBlueprint';
import { SeasonRail } from '@/components/workflow/SeasonRail';
import { buildSeasonRailState } from '@/lib/workflow-ui';

type CalendarEvent = {
  id: string;
  title: string;
  date: string;
  type: 'planting' | 'harvesting' | 'fertilizing' | 'watering' | 'maintenance';
  location?: string;
};

interface Task {
  id?: string;
  title: string;
  description?: string;
  dueAt: Date;
  projectId?: string;
  projectName?: string;
  priority?: 'low' | 'medium' | 'high';
  status: 'pending' | 'scheduled' | 'cancelled';
}

interface CalendarViewProps {
  tasks?: Task[];
  locale: string;
}

function weekdayPalette(index: number): string {
  if (index === 0) return 'text-red-600 dark:text-red-300';
  if (index === 6) return 'text-blue-600 dark:text-blue-300';
  return 'text-muted-foreground';
}

export function CalendarView({ tasks = [], locale }: CalendarViewProps) {
  const t = useTranslations();
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [localTasks, setLocalTasks] = useState<Task[]>(tasks);

  useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);

  const events: CalendarEvent[] = useMemo(
    () =>
      localTasks.map((task, index) => ({
        id: task.id || `task-${index}`,
        title: task.title,
        date: format(task.dueAt, 'yyyy-MM-dd'),
        type: 'maintenance',
        location: task.projectName,
      })),
    [localTasks]
  );

  const previousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const nextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  const goToCurrentMonth = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDate(now);
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);

  const firstDayOfWeek = new Date(monthStart);
  firstDayOfWeek.setDate(monthStart.getDate() - monthStart.getDay());

  const lastDayOfWeek = new Date(monthEnd);
  lastDayOfWeek.setDate(monthEnd.getDate() + (6 - monthEnd.getDay()));

  const days = eachDayOfInterval({ start: firstDayOfWeek, end: lastDayOfWeek });

  const getEventsForDay = (day: Date) => {
    const dayKey = format(day, 'yyyy-MM-dd');
    return events.filter((event) => event.date === dayKey);
  };

  const handleCompleteTask = async (taskId?: string) => {
    if (!taskId) return;

    const res = await fetch(`/api/v1/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed' }),
    });

    if (!res.ok) {
      alert('タスク更新に失敗しました');
      return;
    }

    setLocalTasks((prev) => prev.filter((task) => task.id !== taskId));
    router.refresh();
  };

  const selectedDayTasks = useMemo(() => {
    const selectedKey = format(selectedDate, 'yyyy-MM-dd');
    return localTasks
      .filter((task) => format(task.dueAt, 'yyyy-MM-dd') === selectedKey)
      .sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime());
  }, [localTasks, selectedDate]);

  const monthDayCount = monthEnd.getDate();
  const seasonState = buildSeasonRailState({
    stage: selectedDayTasks.length > 0 ? 'vegetative' : 'seedling',
    progress: Math.round((selectedDate.getDate() / Math.max(monthDayCount, 1)) * 100),
    dayCount: selectedDate.getDate(),
    totalDays: monthDayCount,
    windowLabel: format(currentDate, locale === 'ja' ? 'yyyy年M月' : 'MMMM yyyy'),
    risk: selectedDayTasks.length > 4 ? 'warning' : selectedDayTasks.length > 1 ? 'watch' : 'safe',
    note:
      selectedDayTasks.length > 0
        ? locale === 'ja'
          ? `${selectedDayTasks.length}件の作業が選択日にあります。`
          : `${selectedDayTasks.length} items scheduled for the selected day.`
        : locale === 'ja'
          ? '選択日に予定はありません。'
          : 'No tasks on the selected day.',
  });

  return (
    <div className="space-y-4" style={{ scrollbarGutter: 'stable' }}>
      <SeasonRail state={seasonState} />

      <section className="surface-base p-4">
        <div className="mb-5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={previousMonth}
            className="touch-target rounded-lg border border-border bg-secondary px-3 py-2 text-sm font-semibold text-secondary-foreground hover:bg-secondary/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {locale === 'ja' ? '前月' : 'Prev'}
          </button>

          <div className="text-center">
            <h2 className="text-xl font-semibold text-foreground">
              {format(currentDate, locale === 'ja' ? 'yyyy年 M月' : 'MMMM yyyy')}
            </h2>
            <p className="text-xs text-muted-foreground">{t('calendar.title')}</p>
            <button
              type="button"
              onClick={goToCurrentMonth}
              className="mt-2 rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold text-foreground hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {locale === 'ja' ? '今月に戻る' : 'Back to current month'}
            </button>
          </div>

          <button
            type="button"
            onClick={nextMonth}
            className="touch-target rounded-lg border border-border bg-secondary px-3 py-2 text-sm font-semibold text-secondary-foreground hover:bg-secondary/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {locale === 'ja' ? '翌月' : 'Next'}
          </button>
        </div>

        <div className="mb-2 grid grid-cols-7 gap-2">
          {[
            t('weather.sun'),
            t('weather.mon'),
            t('weather.tue'),
            t('weather.wed'),
            t('weather.thu'),
            t('weather.fri'),
            t('weather.sat'),
          ].map((dayName, index) => (
            <div key={dayName} className={`py-1 text-center text-xs font-semibold uppercase tracking-[0.1em] ${weekdayPalette(index)}`}>
              {dayName}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {days.map((day) => {
            const dayEvents = getEventsForDay(day);
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isSelected = isSameDay(day, selectedDate);

            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => setSelectedDate(day)}
                className={`min-h-[108px] rounded-lg border p-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  isToday(day)
                    ? 'border-brand-seedling/70 bg-brand-seedling/10'
                    : isCurrentMonth
                      ? 'border-border bg-card hover:border-brand-seedling/50'
                      : 'border-border/60 bg-secondary/35 text-muted-foreground'
                } ${isSelected ? 'ring-2 ring-brand-seedling/40' : ''}`}
                aria-pressed={isSelected}
              >
                <div className="mb-1 flex items-center justify-between">
                  <span
                    className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                      isToday(day) ? 'bg-brand-seedling text-primary-foreground' : 'bg-secondary text-secondary-foreground'
                    }`}
                  >
                    {format(day, 'd')}
                  </span>
                  {dayEvents.length > 0 ? (
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-secondary-foreground">
                      {dayEvents.length}
                    </span>
                  ) : null}
                </div>

                <div className="space-y-1">
                  {dayEvents.slice(0, 3).map((event) => (
                    <p key={event.id} className="truncate rounded bg-background/80 px-1.5 py-0.5 text-[10px] text-foreground">
                      {event.title}
                    </p>
                  ))}
                  {dayEvents.length > 3 ? (
                    <p className="text-[10px] font-semibold text-muted-foreground">+{dayEvents.length - 3}</p>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="surface-base p-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base font-semibold text-foreground">
            {format(selectedDate, locale === 'ja' ? 'M月d日' : 'MMM d')}
          </h3>
          <Link
            href={`/${locale}/projects`}
            className="text-sm font-semibold text-brand-seedling hover:text-brand-seedling/80"
          >
            {locale === 'ja' ? 'プロジェクト一覧' : 'Projects'}
          </Link>
        </div>

        {selectedDayTasks.length === 0 ? (
          <div className="mt-3">
            <ModuleBlueprint
              title={locale === 'ja' ? 'この日の予定はありません' : 'No tasks on this day'}
              description={locale === 'ja' ? '別の日付を選ぶか、新しい作業を追加してください。' : 'Pick another date or add a task.'}
              tone="watch"
            />
          </div>
        ) : (
          <ul className="mt-3 space-y-2">
            {selectedDayTasks.map((task) => (
              <li key={task.id} className="rounded-lg border border-border bg-background/70 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{task.title}</p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{task.projectName || '—'}</p>
                    {task.projectId ? (
                      <Link
                        href={`/${locale}/projects/${task.projectId}`}
                        className="mt-1 inline-block text-xs font-semibold text-brand-seedling hover:text-brand-seedling/80"
                      >
                        {locale === 'ja' ? 'プロジェクトを開く' : 'Open project'}
                      </Link>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCompleteTask(task.id)}
                    className="touch-target rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {locale === 'ja' ? '完了' : 'Done'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
