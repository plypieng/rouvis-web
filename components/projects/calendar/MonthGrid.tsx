'use client';

import { useTranslations } from 'next-intl';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import {
  eachDayOfInterval,
  endOfMonth,
  format,
  getDay,
  isSameDay,
  isToday,
  startOfMonth,
} from 'date-fns';
import {
  getWeatherDayRisk,
  weatherIconForDay,
  type WeatherTimelineDayData,
} from '@/lib/weather-timeline';
import type { ProjectTaskItem } from '@/types/project-cockpit';

interface MonthGridProps {
  currentDate: Date;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  tasks: ProjectTaskItem[];
  weatherData: Record<string, WeatherTimelineDayData>;
  startDate: string;
  targetHarvestDate?: string;
  activeDragTaskId?: string | null;
  affectedTaskIds?: Set<string>;
}

function DayTaskChip({
  task,
  source,
  affected,
}: {
  task: ProjectTaskItem;
  source: string;
  affected: boolean;
}) {
  const dateKey = format(new Date(task.dueDate), 'yyyy-MM-dd');
  const draggableId = `task:${source}:${task.id}`;
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: draggableId,
    data: {
      taskId: task.id,
      fromDate: dateKey,
      source,
    },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  return (
    <button
      type="button"
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`w-full truncate rounded-md border px-1.5 py-0.5 text-left text-[10px] font-medium transition ${
        task.status === 'completed'
          ? 'border-border bg-secondary text-muted-foreground line-through'
          : affected
            ? 'border-brand-waterline/55 bg-brand-waterline/15 text-foreground'
            : 'border-border bg-card text-foreground hover:border-brand-seedling/45'
      } ${isDragging ? 'opacity-65 shadow-lift1' : ''}`}
      aria-label={`${task.title} ${format(new Date(task.dueDate), 'M/d')}`}
    >
      {task.title}
    </button>
  );
}

type DayCellProps = {
  day: Date;
  dateKey: string;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  weatherDay?: WeatherTimelineDayData;
  isStart: boolean;
  isHarvest: boolean;
  dayTasks: ProjectTaskItem[];
  affectedTaskIds: Set<string>;
  activeDragTaskId?: string | null;
  t: (key: string, values?: Record<string, string | number | Date>) => string;
};

function DayCell({
  day,
  dateKey,
  selectedDate,
  onSelectDate,
  weatherDay,
  isStart,
  isHarvest,
  dayTasks,
  affectedTaskIds,
  activeDragTaskId = null,
  t,
}: DayCellProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `day:${dateKey}`,
    data: { date: dateKey },
  });

  const isSelected = isSameDay(day, selectedDate);
  const hasActiveDrag = Boolean(activeDragTaskId);
  const weatherRisk = getWeatherDayRisk(weatherDay);
  const weatherIcon = weatherIconForDay(weatherDay);
  const hasRainRisk = weatherRisk === 'rainy';
  const dragRingClass = hasActiveDrag && isOver
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
    <button
      type="button"
      ref={setNodeRef}
      data-testid="project-calendar-day"
      data-date={dateKey}
      data-weather-risk={weatherRisk}
      data-weather-precip={weatherDay ? Math.round(weatherDay.precipProbability) : undefined}
      onClick={() => onSelectDate(day)}
      className={`flex min-h-[98px] flex-col border-b border-r border-border/70 p-1.5 text-left transition ${
        isSelected
          ? 'bg-brand-waterline/10 ring-1 ring-inset ring-brand-waterline/55'
          : 'bg-card hover:bg-secondary/40'
      } ${weatherOverlayClass} ${isToday(day) ? 'border-brand-seedling/55' : ''} ${dragRingClass}`}
      aria-label={t('drop_target_label', { date: format(day, 'M/d') })}
    >
      <div className="mb-1 flex items-start justify-between gap-1">
        <span
          className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold ${
            isSelected
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
              <span className="material-symbols-outlined text-[13px] text-muted-foreground" data-testid="project-calendar-weather-icon">
                {weatherIcon}
              </span>
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                hasRainRisk ? 'bg-destructive/15 text-destructive' : 'bg-secondary text-muted-foreground'
              }`}>
                {Math.round(weatherDay.precipProbability)}%
              </span>
              {weatherDay.temperature ? (
                <span className="text-[10px] font-medium text-muted-foreground">
                  {Math.round(weatherDay.temperature.max)}°/{Math.round(weatherDay.temperature.min)}°
                </span>
              ) : null}
            </>
          ) : null}
          {isStart ? <span className="material-symbols-outlined text-[14px] text-brand-seedling" title={t('start_date')}>flag</span> : null}
          {isHarvest ? <span className="material-symbols-outlined text-[14px] text-risk-warning" title={t('harvest_date')}>agriculture</span> : null}
        </div>
      </div>

      <div className="space-y-1">
        {dayTasks.slice(0, 3).map((task) => (
          <DayTaskChip
            key={`month-chip-${task.id}`}
            task={task}
            source="month"
            affected={affectedTaskIds.has(task.id)}
          />
        ))}
        {dayTasks.length > 3 ? (
          <p className="truncate text-[10px] font-semibold text-muted-foreground">
            {t('more_tasks', { count: dayTasks.length - 3 })}
          </p>
        ) : null}
        {hasActiveDrag && isOver ? (
          <p className={`text-[10px] font-semibold ${hasRainRisk ? 'text-destructive' : 'text-brand-seedling'}`}>
            {hasRainRisk ? t('drop_hint_rain') : t('drop_hint')}
          </p>
        ) : null}
      </div>
    </button>
  );
}

export default function MonthGrid({
  currentDate,
  selectedDate,
  onSelectDate,
  tasks,
  weatherData,
  startDate,
  targetHarvestDate,
  activeDragTaskId = null,
  affectedTaskIds = new Set<string>(),
}: MonthGridProps) {
  const t = useTranslations('projects.calendar');

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = getDay(monthStart);

  const projectStart = new Date(startDate);
  const projectEnd = targetHarvestDate ? new Date(targetHarvestDate) : null;

  const getTasksForDay = (day: Date) => (
    tasks.filter((task) => isSameDay(new Date(task.dueDate), day))
  );

  const weekdays = [t('weekday_sun'), t('weekday_mon'), t('weekday_tue'), t('weekday_wed'), t('weekday_thu'), t('weekday_fri'), t('weekday_sat')];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="grid grid-cols-7 border-b border-border bg-secondary/45">
        {weekdays.map((label, index) => (
          <div
            key={label}
            className={`py-2 text-center text-[11px] font-semibold ${index === 0 ? 'text-risk-critical' : index === 6 ? 'text-brand-waterline' : 'text-muted-foreground'}`}
          >
            {label}
          </div>
        ))}
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-7 auto-rows-fr">
        {Array.from({ length: startDayOfWeek }).map((_, index) => (
          <div key={`empty-${index}`} className="border-b border-r border-border/70 bg-secondary/20" />
        ))}

        {days.map((day) => {
          const dayTasks = getTasksForDay(day);
          const dateKey = format(day, 'yyyy-MM-dd');
          return (
            <DayCell
              key={day.toISOString()}
              day={day}
              dateKey={dateKey}
              selectedDate={selectedDate}
              onSelectDate={onSelectDate}
              weatherDay={weatherData[dateKey]}
              isStart={isSameDay(day, projectStart)}
              isHarvest={projectEnd ? isSameDay(day, projectEnd) : false}
              dayTasks={dayTasks}
              affectedTaskIds={affectedTaskIds}
              activeDragTaskId={activeDragTaskId}
              t={t}
            />
          );
        })}

        {Array.from({ length: 42 - (startDayOfWeek + days.length) }).map((_, index) => (
          <div key={`fill-${index}`} className="border-b border-r border-border/70 bg-secondary/20" />
        ))}
      </div>
    </div>
  );
}
