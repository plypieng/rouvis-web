'use client';

import { useState, useEffect } from 'react';
import { Activity, Calendar, MapPin, TrendingUp, Clock, Plus } from 'lucide-react';
import { ActivityFeedCard } from './ActivityFeedCard';
import { TaskSchedulerCard } from './TaskSchedulerCard';
import { FieldCard } from './FieldCard';
import { FieldEditModal } from './FieldEditModal';
import { toastError, toastSuccess, toastWarning } from '@/lib/feedback';

interface ActivityItem {
  id: string;
  type: 'watering' | 'fertilizing' | 'harvesting' | 'planting' | 'maintenance';
  fieldId?: string;
  fieldName?: string;
  quantity?: number;
  unit?: string;
  note?: string;
  timestamp: Date;
  status: 'completed' | 'pending' | 'cancelled';
}

interface Task {
  id?: string;
  title: string;
  description?: string;
  dueAt: Date;
  fieldId?: string;
  fieldName?: string;
  priority?: 'low' | 'medium' | 'high';
  status: 'pending' | 'scheduled' | 'cancelled' | 'completed';
}

interface Field {
  id: string;
  name: string;
  crop?: string;
  // Align with FieldCard expectations
  area_sqm?: number;
  area?: number;
  geojson?: unknown;
  polygon?: unknown;
  created_at?: string;
  updated_at?: string;
  createdAt?: string;
  updatedAt?: string;
  location?: string;
}

type EditableField = {
  id: string;
  name: string;
  crop?: string;
  area_sqm?: number;
  geojson?: unknown;
  created_at: string;
  updated_at: string;
};

interface ActivityDashboardProps {
  onLogActivity?: () => void;
  onScheduleTask?: () => void;
  onViewCalendar?: () => void;
}

export function ActivityDashboard({
  onLogActivity,
  onScheduleTask,
  onViewCalendar,
}: ActivityDashboardProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<{
    type: 'success' | 'error' | 'warning';
    message: string;
    actionLabel?: string;
    onAction?: () => void;
  } | null>(null);
  const [editingField, setEditingField] = useState<EditableField | null>(null);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
  const [deletingFieldId, setDeletingFieldId] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (!actionNotice || actionNotice.onAction) return;
    const timeout = setTimeout(() => setActionNotice(null), 4000);
    return () => clearTimeout(timeout);
  }, [actionNotice]);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Fetch fields first to allow mapping
      let loadedFields: Field[] = [];
      const fieldsResponse = await fetch('/api/v1/fields');
      if (fieldsResponse.ok) {
        const fieldsData = (await fieldsResponse.json()) as { fields?: Field[] };
        loadedFields = fieldsData.fields || [];
        setFields(loadedFields);
      }

      // 2. Fetch activities
      const activitiesResponse = await fetch('/api/v1/activities');
      if (activitiesResponse.ok) {
        type ActivityApiItem = Omit<ActivityItem, 'timestamp'> & { timestamp: string };
        const activitiesData = (await activitiesResponse.json()) as { activities?: ActivityApiItem[] };
        const parsedActivities = (activitiesData.activities || []).map((activity) => ({
          ...activity,
          timestamp: new Date(activity.timestamp),
          fieldName: activity.fieldName || loadedFields.find(f => f.id === activity.fieldId)?.name
        }));
        setActivities(parsedActivities);
      }

      // 3. Fetch tasks
      try {
        const tasksResponse = await fetch('/api/v1/tasks');
        if (tasksResponse.ok) {
          type TaskApiItem = Omit<Task, 'dueAt'> & { dueAt: string };
          const tasksData = (await tasksResponse.json()) as { tasks?: TaskApiItem[] };
          const parsedTasks = (tasksData.tasks || []).map((task) => ({
            ...task,
            dueAt: new Date(task.dueAt),
            fieldName: task.fieldName || loadedFields.find(f => f.id === task.fieldId)?.name
          }));
          setTasks(parsedTasks);
        } else {
          console.error('Failed to fetch tasks:', tasksResponse.statusText);
        }
      } catch (taskError) {
        console.error('Error fetching tasks:', taskError);
      }

    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError('データの読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const updateTaskStatus = async (taskId: string, status: Task['status']) => {
    if (!taskId) return;
    if (updatingTaskId === taskId) return;
    setActionNotice(null);
    setUpdatingTaskId(taskId);
    try {
      const res = await fetch(`/api/v1/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const message = data.error || 'タスク更新に失敗しました';
        setActionNotice({
          type: 'error',
          message,
          actionLabel: '再試行',
          onAction: () => { void updateTaskStatus(taskId, status); },
        });
        toastError(message, {
          label: '再試行',
          onClick: () => { void updateTaskStatus(taskId, status); },
        });
        return;
      }

      // Optimistic UI update
      setTasks(prev => prev.map(task => (task.id === taskId ? { ...task, status } : task)));
      setActionNotice({
        type: 'success',
        message: 'タスクを更新しました。',
      });
      toastSuccess('タスクを更新しました。');
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const deleteField = async (fieldId: string, fieldName: string) => {
    if (!fieldId) return;
    if (deletingFieldId === fieldId) return;
    setActionNotice(null);

    setDeletingFieldId(fieldId);
    try {
      const res = await fetch(`/api/v1/fields/${fieldId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const message = data.error || '圃場の削除に失敗しました';
        setActionNotice({
          type: 'error',
          message,
          actionLabel: '再試行',
          onAction: () => { void deleteField(fieldId, fieldName); },
        });
        toastError(message, {
          label: '再試行',
          onClick: () => { void deleteField(fieldId, fieldName); },
        });
        return;
      }

      // Remove locally
      setFields(prev => prev.filter(field => field.id !== fieldId));
      setActionNotice({
        type: 'success',
        message: `「${fieldName}」を削除しました。`,
      });
      toastSuccess(`「${fieldName}」を削除しました。`);
    } finally {
      setDeletingFieldId(null);
    }
  };

  const requestDeleteField = (fieldId: string, fieldName: string) => {
    const message = `「${fieldName}」を削除しますか？この操作は元に戻せません。`;
    setActionNotice({
      type: 'warning',
      message,
      actionLabel: '削除する',
      onAction: () => { void deleteField(fieldId, fieldName); },
    });
    toastWarning(message, {
      label: '削除する',
      onClick: () => { void deleteField(fieldId, fieldName); },
    });
  };

  const getTodayActivities = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return activities.filter(activity => {
      const activityDate = new Date(activity.timestamp);
      activityDate.setHours(0, 0, 0, 0);
      return activityDate.getTime() === today.getTime();
    });
  };

  const getUpcomingTasks = () => {
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return tasks
      .filter(task => task.dueAt >= now && task.dueAt <= nextWeek && task.status === 'pending')
      .map(task => ({
        ...task,
        status: 'pending' as const,
        fieldName: task.fieldName || fields.find(f => f.id === task.fieldId)?.name
      }))
      .sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime())
      .slice(0, 5);
  };

  const getFieldStatus = () => {
    return fields.map(field => ({
      ...field,
      lastActivity: activities
        .filter(activity => activity.fieldName === field.name)
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0],
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-600 mb-4">⚠️ {error}</div>
        <button
          onClick={fetchDashboardData}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          再試行
        </button>
      </div>
    );
  }

  const todayActivities = getTodayActivities();
  const upcomingTasks = getUpcomingTasks();
  const fieldStatus = getFieldStatus();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">農業活動ダッシュボード</h2>
          <p className="text-gray-600 mt-1">今日の活動状況と今後の予定を確認</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onLogActivity}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            活動を記録
          </button>
          <button
            onClick={onScheduleTask}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Calendar className="w-4 h-4" />
            タスクを予定
          </button>
        </div>
      </div>

      {actionNotice && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            actionNotice.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : actionNotice.type === 'warning'
                ? 'border-amber-200 bg-amber-50 text-amber-800'
                : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <span>{actionNotice.message}</span>
            {actionNotice.onAction && actionNotice.actionLabel && (
              <button
                type="button"
                onClick={actionNotice.onAction}
                className="rounded-md border border-current px-2 py-1 text-xs font-semibold hover:bg-white/40"
              >
                {actionNotice.actionLabel}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Activity className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{todayActivities.length}</div>
              <div className="text-sm text-gray-600">今日の活動</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{upcomingTasks.length}</div>
              <div className="text-sm text-gray-600">今週のタスク</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <MapPin className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{fields.length}</div>
              <div className="text-sm text-gray-600">管理圃場</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {activities.filter(a => a.status === 'completed').length}
              </div>
              <div className="text-sm text-gray-600">完了活動</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activities */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">最近の活動</h3>
            <button
              onClick={onViewCalendar}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              カレンダーを見る →
            </button>
          </div>
          <ActivityFeedCard
            activities={activities.slice(0, 5)}
            maxItems={5}
            showFilters={false}
            realtime={false}
          />
        </div>

        {/* Upcoming Tasks */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">今後のタスク</h3>
            <button
              onClick={onScheduleTask}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              新規予定 →
            </button>
          </div>
          <div className="space-y-3">
            {upcomingTasks.length === 0 ? (
              <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                今週の予定されたタスクはありません
              </div>
            ) : (
              upcomingTasks.map((task) => (
                <TaskSchedulerCard
                  key={task.id || `task-${task.title}`}
                  task={task}
                  onConfirm={() => {
                    if (!task.id) return;
                    void updateTaskStatus(task.id, 'scheduled');
                  }}
                  onCancel={() => {
                    if (!task.id) return;
                    void updateTaskStatus(task.id, 'cancelled');
                  }}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Field Status */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">圃場状況</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {fieldStatus.map((field) => {
            const areaSqm = field.area_sqm ?? field.area;
            const createdAt = field.created_at ?? field.createdAt ?? new Date().toISOString();
            const updatedAt = field.updated_at ?? field.updatedAt ?? new Date().toISOString();
            const safeField = {
              id: field.id,
              name: field.name,
              crop: field.crop,
              area_sqm: areaSqm,
              geojson: field.geojson ?? undefined,
              created_at: createdAt,
              updated_at: updatedAt,
            };
            return (
              <FieldCard
                key={field.id}
                field={safeField}
                viewMode="grid"
                onEdit={() => {
                  setEditingField({
                    ...safeField,
                    geojson: undefined,
                  });
                }}
                onDelete={() => {
                  requestDeleteField(field.id, field.name);
                }}
              />
            );
          })}
        </div>
      </div>

      {editingField && (
        <FieldEditModal
          field={editingField}
          onClose={() => setEditingField(null)}
          onSubmit={async (data) => {
            const res = await fetch(`/api/v1/fields/${editingField.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: data.name,
                crop: data.crop,
                geojson: data.geojson,
              }),
            });

            if (!res.ok) {
              const payload = await res.json().catch(() => ({}));
              throw new Error(payload.error || 'Failed to update field');
            }

            setEditingField(null);
            await fetchDashboardData();
          }}
        />
      )}
    </div>
  );
}
