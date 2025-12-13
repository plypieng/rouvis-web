'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, isToday } from 'date-fns';

type CalendarEvent = {
  id: string;
  title: string;
  date: string;
  type: 'planting' | 'harvesting' | 'fertilizing' | 'watering' | 'maintenance';
  crop?: string;
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

export function CalendarView({ tasks = [], locale }: CalendarViewProps) {
  const t = useTranslations();
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [localTasks, setLocalTasks] = useState<Task[]>(tasks);

  useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);

  const events: CalendarEvent[] = useMemo(() => (
    localTasks.map(task => ({
      id: task.id || `task-${Date.now()}`,
      title: task.title,
      date: format(task.dueAt, 'yyyy-MM-dd'),
      type: 'maintenance',
      location: task.projectName,
    }))
  ), [localTasks]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'planting':
        return '🌱';
      case 'harvesting':
        return '🌾';
      case 'fertilizing':
        return '🧪';
      case 'watering':
        return '💧';
      case 'maintenance':
        return '🔧';
      default:
        return '📋';
    }
  };

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

  // Generate days for the current month view including previous/next month days
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);

  // Get first day of week (including previous month days)
  const firstDayOfWeek = new Date(monthStart);
  firstDayOfWeek.setDate(monthStart.getDate() - monthStart.getDay());

  // Get last day of week (including next month days)
  const lastDayOfWeek = new Date(monthEnd);
  lastDayOfWeek.setDate(monthEnd.getDate() + (6 - monthEnd.getDay()));

  // Include all visible days
  const days = eachDayOfInterval({ start: firstDayOfWeek, end: lastDayOfWeek });

  // Get events for a specific day
  const getEventsForDay = (day: Date) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return events.filter(event => event.date === dayStr);
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

    setLocalTasks(prev => prev.filter(t => t.id !== taskId));
    router.refresh();
  };

  const selectedDayTasks = useMemo(() => {
    const selectedStr = format(selectedDate, 'yyyy-MM-dd');
    return localTasks
      .filter(t => format(t.dueAt, 'yyyy-MM-dd') === selectedStr)
      .sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime());
  }, [localTasks, selectedDate]);

  return (
    <div className="h-full w-full" style={{ scrollbarGutter: 'stable' }}>
      <div className="flex justify-between items-center mb-6 bg-gradient-to-r from-blue-600 via-cyan-600 to-emerald-600 text-white p-4 rounded-xl shadow-lg">
        <button
          onClick={previousMonth}
          className="p-2 rounded-lg hover:bg-white/20 transition-all transform hover:scale-110"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="text-center">
          <h2 className="text-2xl font-bold tracking-wide">
            {format(currentDate, locale === 'ja' ? 'yyyy年 M月' : 'MMMM yyyy')}
          </h2>
          <p className="text-xs mt-1 opacity-90">{t('calendar.title')}</p>
          <button
            type="button"
            onClick={goToCurrentMonth}
            className="mt-2 inline-flex items-center rounded-full bg-white/20 px-3 py-1 text-xs font-semibold hover:bg-white/30"
          >
            {locale === 'ja' ? '今日へ' : 'Today'}
          </button>
        </div>
        <button
          onClick={nextMonth}
          className="p-2 rounded-lg hover:bg-white/20 transition-all transform hover:scale-110"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="w-full">
        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-2 mb-3">
          {[
            { name: t('weather.sun'), color: 'text-red-600' },
            { name: t('weather.mon'), color: 'text-gray-700' },
            { name: t('weather.tue'), color: 'text-gray-700' },
            { name: t('weather.wed'), color: 'text-gray-700' },
            { name: t('weather.thu'), color: 'text-gray-700' },
            { name: t('weather.fri'), color: 'text-gray-700' },
            { name: t('weather.sat'), color: 'text-blue-600' }
          ].map((day) => (
            <div key={day.name} className={`text-sm font-bold text-center py-2 ${day.color}`}>
              {day.name}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-2">
          {days.map((day) => {
            const dayEvents = getEventsForDay(day);
            const isCurrentMonth = isSameMonth(day, currentDate);
            return (
              <div
                key={day.toString()}
                onClick={() => setSelectedDate(day)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') setSelectedDate(day);
                }}
                className={`h-28 p-2 border-2 rounded-xl transition-all transform hover:scale-105 hover:shadow-xl cursor-pointer ${isToday(day)
                  ? 'bg-gradient-to-br from-emerald-50 via-green-50 to-cyan-50 border-emerald-400 shadow-lg ring-2 ring-emerald-300'
                  : isCurrentMonth
                    ? 'bg-white border-gray-200 hover:border-blue-300 shadow-sm'
                    : 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200 opacity-50 hover:opacity-75'
                  } ${isSameDay(day, selectedDate) ? 'ring-2 ring-blue-500' : ''}`}
              >
                <div className="flex flex-col items-center w-full h-full overflow-hidden">
                  {/* Date */}
                  <span
                    className={`text-sm font-bold inline-flex items-center justify-center rounded-full w-7 h-7 ${isToday(day)
                      ? 'bg-gradient-to-br from-emerald-600 to-green-600 text-white shadow-md'
                      : 'text-gray-700'
                      }`}
                  >
                    {format(day, 'd')}
                  </span>

                  {/* Event Count */}
                  {dayEvents.length > 0 && (
                    <span className="text-[9px] font-semibold px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full whitespace-nowrap">
                      {dayEvents.length}件
                    </span>
                  )}

                  {/* Icons Grid */}
                  {dayEvents.length > 0 && (
                    <div className="flex flex-wrap gap-0.5 justify-center mt-1">
                      {dayEvents.slice(0, 3).map((event) => (
                        <span
                          key={event.id}
                          className="text-sm"
                          title={event.title}
                        >
                          {getTypeIcon(event.type)}
                        </span>
                      ))}
                      {dayEvents.length > 3 && (
                        <span className="text-[8px] font-semibold text-blue-600 pl-0.5">
                          +{dayEvents.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base font-bold text-gray-900">
            {format(selectedDate, locale === 'ja' ? 'M月d日' : 'MMM d')}
          </h3>
          <Link
            href={`/${locale}/projects`}
            className="text-sm text-blue-700 hover:underline"
          >
            プロジェクト一覧 →
          </Link>
        </div>

        {selectedDayTasks.length === 0 ? (
          <p className="mt-3 text-sm text-gray-600">この日の予定はありません。</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {selectedDayTasks.map((task) => (
              <li key={task.id} className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 p-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm" aria-hidden="true">🔧</span>
                    <p className="font-medium text-gray-900 truncate">{task.title}</p>
                  </div>
                  <p className="mt-0.5 text-xs text-gray-600 truncate">
                    {task.projectName || '—'}
                  </p>
                  {task.projectId && (
                    <Link
                      href={`/${locale}/projects/${task.projectId}`}
                      className="mt-1 inline-block text-xs text-blue-700 hover:underline"
                    >
                      プロジェクトへ →
                    </Link>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleCompleteTask(task.id)}
                  className="shrink-0 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                >
                  完了
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

    </div>
  );
}
