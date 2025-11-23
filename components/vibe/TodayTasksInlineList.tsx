'use client';

import { useTranslations } from 'next-intl';
import { CheckCircle2, Circle, Clock, AlertCircle } from 'lucide-react';
import { Task } from '@/hooks/useTodayTasks';

interface TodayTasksInlineListProps {
  tasks: Task[];
  loading?: boolean;
  onToggleTask: (taskId: string) => void;
  showProgress?: boolean;
  compact?: boolean;
}

/**
 * Inline task checklist for Today's Overview
 *
 * Features:
 * - Checkbox list with priority badges
 * - Field context and ETA display
 * - Progress indicator
 * - Weather-dependent badges
 * - Optimistic UI updates
 */
export function TodayTasksInlineList({
  tasks,
  loading = false,
  onToggleTask,
  showProgress = true,
  compact = false,
}: TodayTasksInlineListProps) {
  const t = useTranslations();

  const priorityColors = {
    high: {
      bg: 'bg-rose-50',
      border: 'border-rose-200',
      text: 'text-rose-700',
      badge: 'bg-rose-100 text-rose-700',
    },
    medium: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      text: 'text-amber-700',
      badge: 'bg-amber-100 text-amber-700',
    },
    low: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-700',
      badge: 'bg-green-100 text-green-700',
    },
  };

  const completedCount = tasks.filter((t) => t.completed).length;
  const totalCount = tasks.length;

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse flex items-center gap-3 p-3 rounded-lg border border-gray-200">
            <div className="w-5 h-5 bg-gray-200 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center py-6 text-gray-500">
        <Clock className="w-8 h-8 mx-auto mb-2 text-gray-400" />
        <p className="text-sm">{t('today.tasks.none')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Progress indicator */}
      {showProgress && totalCount > 0 && (
        <div className="flex items-center justify-between text-sm mb-3">
          <span className="text-gray-600 font-medium">
            {t('today.tasks.completed', { done: completedCount, total: totalCount })}
          </span>
          <div className="flex-1 max-w-[120px] ml-3">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-500 ease-out"
                style={{ width: `${(completedCount / totalCount) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Task list */}
      <ul className={`space-y-2 ${compact ? 'text-sm' : ''}`} role="list" aria-live="polite">
        {tasks.map((task) => {
          const colors = priorityColors[task.priority];

          return (
            <li
              key={task.id}
              className={`
                flex items-start gap-3 p-3 rounded-lg border transition-all
                ${task.completed
                  ? 'bg-gray-50 border-gray-200 opacity-60'
                  : `${colors.bg} ${colors.border}`
                }
                hover:shadow-sm cursor-pointer
              `}
              onClick={() => onToggleTask(task.id)}
              role="button"
              aria-label={`${task.completed ? 'Mark as incomplete' : 'Mark as complete'}: ${task.title}`}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onToggleTask(task.id);
                }
              }}
            >
              {/* Checkbox icon */}
              <div className="flex-shrink-0 mt-0.5">
                {task.completed ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600" aria-hidden="true" />
                ) : (
                  <Circle className={`w-5 h-5 ${colors.text}`} aria-hidden="true" />
                )}
              </div>

              {/* Task content */}
              <div className="flex-1 min-w-0">
                <p
                  className={`font-medium ${
                    task.completed ? 'line-through text-gray-500' : 'text-gray-900'
                  }`}
                >
                  {task.title}
                </p>

                {/* Task metadata */}
                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                  {/* Priority badge */}
                  {!task.completed && task.priority === 'high' && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${colors.badge} font-medium`}>
                      優先
                    </span>
                  )}

                  {/* Field */}
                  {task.field && (
                    <span className="text-xs text-gray-600 bg-white/70 px-2 py-0.5 rounded">
                      {t('today.tasks.field', { field: task.field })}
                    </span>
                  )}

                  {/* Estimated time */}
                  {task.estimatedTime && (
                    <span className="text-xs text-gray-600 bg-white/70 px-2 py-0.5 rounded flex items-center gap-1">
                      <Clock className="w-3 h-3" aria-hidden="true" />
                      {t('today.tasks.eta', { time: task.estimatedTime })}
                    </span>
                  )}

                  {/* Weather dependent */}
                  {task.weatherDependent && (
                    <span className="text-xs text-sky-600 bg-sky-50 px-2 py-0.5 rounded flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" aria-hidden="true" />
                      {t('today.tasks.weather_dependent')}
                    </span>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
