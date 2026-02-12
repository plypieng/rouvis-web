'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  eachDayOfInterval,
  eachMonthOfInterval,
  endOfMonth,
  endOfYear,
  format,
  getDay,
  isSameDay,
  isToday,
  isWithinInterval,
  startOfMonth,
  startOfYear,
} from 'date-fns';
import type { ProjectTaskItem } from '@/types/project-cockpit';

interface ProjectYearViewProps {
  startDate: string;
  targetHarvestDate?: string;
  tasks: ProjectTaskItem[];
}

export default function ProjectYearView({ startDate, targetHarvestDate, tasks }: ProjectYearViewProps) {
  const t = useTranslations('projects.calendar');
  const [currentYear, setCurrentYear] = useState(new Date(startDate).getFullYear());

  const yearStart = startOfYear(new Date(currentYear, 0, 1));
  const yearEnd = endOfYear(new Date(currentYear, 0, 1));
  const months = eachMonthOfInterval({ start: yearStart, end: yearEnd });

  const projectStart = new Date(startDate);
  const projectEnd = targetHarvestDate ? new Date(targetHarvestDate) : null;

  const weekdays = [t('weekday_sun'), t('weekday_mon'), t('weekday_tue'), t('weekday_wed'), t('weekday_thu'), t('weekday_fri'), t('weekday_sat')];

  const getTaskIndicator = (day: Date) => {
    const dayTasks = tasks.filter((task) => isSameDay(new Date(task.dueDate), day));
    if (dayTasks.length === 0) return null;

    const hasPending = dayTasks.some((task) => task.status !== 'completed');
    const toneClass = hasPending ? 'bg-brand-waterline' : 'bg-brand-seedling';

    return <span className={`absolute -bottom-0.5 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full ${toneClass}`} />;
  };

  return (
    <div className="flex h-full min-h-0 flex-col p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <span className="material-symbols-outlined text-brand-seedling">calendar_month</span>
          {t('year_view')}
        </h2>
        <div className="rounded-lg border border-border bg-secondary p-1">
          <button type="button" onClick={() => setCurrentYear((prev) => prev - 1)} className="touch-target rounded-md p-1 text-muted-foreground hover:bg-card hover:text-foreground">
            <span className="material-symbols-outlined text-[18px]">chevron_left</span>
          </button>
          <span className="px-3 text-sm font-semibold text-foreground">
            {t('year_label', { year: currentYear })}
          </span>
          <button type="button" onClick={() => setCurrentYear((prev) => prev + 1)} className="touch-target rounded-md p-1 text-muted-foreground hover:bg-card hover:text-foreground">
            <span className="material-symbols-outlined text-[18px]">chevron_right</span>
          </button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-brand-seedling" />{t('start_date')}</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-risk-warning" />{t('harvest_date')}</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-brand-waterline" />{t('task_pending')}</span>
      </div>

      <div className="mobile-scroll min-h-0 flex-1 overflow-y-auto pr-1">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {months.map((month) => {
            const monthStart = startOfMonth(month);
            const monthEnd = endOfMonth(month);
            const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
            const startDayOfWeek = getDay(monthStart);

            return (
              <section key={month.toISOString()} className="rounded-lg border border-border bg-card p-3">
                <h3 className="mb-2 border-b border-border pb-1 text-sm font-semibold text-foreground">
                  {t('month_label', { month: format(month, 'M') })}
                </h3>
                <div className="mb-1 grid grid-cols-7 gap-y-1 text-center">
                  {weekdays.map((label, index) => (
                    <div key={`${month.toISOString()}-${label}`} className={`text-[10px] font-semibold ${index === 0 ? 'text-risk-critical' : index === 6 ? 'text-brand-waterline' : 'text-muted-foreground'}`}>
                      {label}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-y-1 justify-items-center">
                  {Array.from({ length: startDayOfWeek }).map((_, index) => (
                    <div key={`empty-${month.toISOString()}-${index}`} className="h-6 w-6" />
                  ))}

                  {days.map((day) => {
                    const isWithinProjectWindow = Boolean(projectEnd && isWithinInterval(day, { start: projectStart, end: projectEnd }));
                    return (
                      <div
                        key={day.toISOString()}
                        className={`relative flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-medium ${
                          isSameDay(day, projectStart)
                            ? 'bg-brand-seedling text-primary-foreground'
                            : projectEnd && isSameDay(day, projectEnd)
                              ? 'bg-risk-warning text-primary-foreground'
                              : isToday(day)
                                ? 'ring-1 ring-brand-waterline text-brand-waterline'
                                : isWithinProjectWindow
                                  ? 'bg-secondary text-foreground'
                                  : getDay(day) === 0
                                    ? 'text-risk-critical'
                                    : getDay(day) === 6
                                      ? 'text-brand-waterline'
                                      : 'text-foreground'
                        }`}
                      >
                        {format(day, 'd')}
                        {getTaskIndicator(day)}
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
