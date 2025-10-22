'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { CheckCircle2, Circle, Clock } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  field?: string;
  estimatedTime?: string;
  priority: 'high' | 'medium' | 'low';
  completed: boolean;
  weatherDependent?: boolean;
}

/**
 * Today's Tasks Card - Auto-generated daily tasks
 *
 * Principles (FARMER_UX_VISION.md):
 * - Shows "What should I do today?" immediately
 * - Weather-aware priorities
 * - Checkable list (satisfying completion)
 * - Field context included
 */
export function TodayTasksCard() {
  const t = useTranslations();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Fetch from GET /v1/tasks?date=today or equivalent
    // For now, show placeholder

    const mockTasks: Task[] = [
      {
        id: '1',
        title: 'A圃場に水やり',
        field: 'A圃場',
        estimatedTime: '30分',
        priority: 'high',
        completed: false,
        weatherDependent: true,
      },
      {
        id: '2',
        title: 'B圃場の生育確認',
        field: 'B圃場',
        estimatedTime: '15分',
        priority: 'medium',
        completed: false,
      },
      {
        id: '3',
        title: '作業記録の整理',
        estimatedTime: '10分',
        priority: 'low',
        completed: false,
      },
    ];

    // Simulate loading
    setTimeout(() => {
      setTasks(mockTasks);
      setLoading(false);
    }, 500);
  }, []);

  const toggleTask = (taskId: string) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId ? { ...task, completed: !task.completed } : task
      )
    );

    // TODO: Update backend via PATCH /v1/tasks/:id
  };

  const priorityColors = {
    high: 'text-red-600 bg-red-50 border-red-200',
    medium: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    low: 'text-gray-600 bg-gray-50 border-gray-200',
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Clock className="w-5 h-5 text-green-600" />
          {t('today.tasks.title')}
        </h2>
        <button
          className="text-sm text-green-600 hover:text-green-700 font-medium"
          onClick={() => {
            // TODO: Open chat with "今日は何をすればいいですか？"
            console.log('Generate today\'s plan');
          }}
          aria-label={t('today.tasks.regenerate')}
        >
          {t('today.tasks.regenerate')}
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse flex items-center gap-3">
              <div className="w-5 h-5 bg-gray-200 rounded-full" />
              <div className="flex-1 h-4 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p className="mb-2">{t('today.tasks.none')}</p>
          <button
            className="text-green-600 hover:text-green-700 font-medium text-sm"
            onClick={() => {
              // TODO: Trigger task generation
            }}
            aria-label={t('today.tasks.generate')}
          >
            {t('today.tasks.generate')}
          </button>
        </div>
      ) : (
        <ul className="space-y-2" aria-live="polite">
          {tasks.map((task) => (
            <li
              key={task.id}
              className={`
                flex items-start gap-3 p-3 rounded-lg border transition-all
                ${task.completed ? 'bg-gray-50 border-gray-200 opacity-60' : priorityColors[task.priority]}
                hover:shadow-sm cursor-pointer
              `}
              onClick={() => toggleTask(task.id)}
            >
              <div className="flex-shrink-0 mt-0.5">
                {task.completed ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                ) : (
                  <Circle className="w-5 h-5" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm font-medium ${
                    task.completed ? 'line-through text-gray-500' : 'text-gray-900'
                  }`}
                >
                  {task.title}
                </p>
                <div className="flex items-center gap-2 mt-1 text-xs text-gray-600">
                  {task.field && (
                    <span className="bg-white/50 px-2 py-0.5 rounded">
                      {t('today.tasks.field', { field: task.field })}
                    </span>
                  )}
                  {task.estimatedTime && (
                    <span className="bg-white/50 px-2 py-0.5 rounded">
                      {t('today.tasks.eta', { time: task.estimatedTime })}
                    </span>
                  )}
                  {task.weatherDependent && (
                    <span className="bg-white/50 px-2 py-0.5 rounded">
                      {t('today.tasks.weather_dependent')}
                    </span>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {tasks.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between text-sm">
          <span className="text-gray-600">
            {t('today.tasks.completed', {
              done: tasks.filter((t) => t.completed).length,
              total: tasks.length
            })}
          </span>
          <button
            className="text-green-600 hover:text-green-700 font-medium"
            onClick={() => {
              // TODO: Navigate to week view
              console.log('Show week view');
            }}
            aria-label={t('today.tasks.week_view')}
          >
            {t('today.tasks.week_view')}
          </button>
        </div>
      )}
    </div>
  );
}
