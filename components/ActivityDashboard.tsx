'use client';

import { useEffect, useState } from 'react';
import { Activity, Calendar, Clock, MapPin, Plus, TrendingUp } from 'lucide-react';
import { ActivityFeedCard } from './ActivityFeedCard';
import { TaskSchedulerCard } from './TaskSchedulerCard';
import { FieldCard } from './FieldCard';
import { FieldEditModal } from './FieldEditModal';
import { ModuleBlueprint } from '@/components/workflow/ModuleBlueprint';
import { SeasonRail } from '@/components/workflow/SeasonRail';
import { buildSeasonRailState } from '@/lib/workflow-ui';

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

export function ActivityDashboard({ onLogActivity, onScheduleTask, onViewCalendar }: ActivityDashboardProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<EditableField | null>(null);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
  const [deletingFieldId, setDeletingFieldId] = useState<string | null>(null);

  useEffect(() => {
    void fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);

    try {
      let loadedFields: Field[] = [];
      const fieldsResponse = await fetch('/api/v1/fields');
      if (fieldsResponse.ok) {
        const fieldsData = (await fieldsResponse.json()) as { fields?: Field[] };
        loadedFields = fieldsData.fields || [];
        setFields(loadedFields);
      }

      const activitiesResponse = await fetch('/api/v1/activities');
      if (activitiesResponse.ok) {
        type ActivityApiItem = Omit<ActivityItem, 'timestamp'> & { timestamp: string };
        const activitiesData = (await activitiesResponse.json()) as { activities?: ActivityApiItem[] };
        const parsedActivities = (activitiesData.activities || []).map((activity) => ({
          ...activity,
          timestamp: new Date(activity.timestamp),
          fieldName: activity.fieldName || loadedFields.find((field) => field.id === activity.fieldId)?.name,
        }));
        setActivities(parsedActivities);
      }

      try {
        const tasksResponse = await fetch('/api/v1/tasks');
        if (tasksResponse.ok) {
          type TaskApiItem = Omit<Task, 'dueAt'> & { dueAt: string };
          const tasksData = (await tasksResponse.json()) as { tasks?: TaskApiItem[] };
          const parsedTasks = (tasksData.tasks || []).map((task) => ({
            ...task,
            dueAt: new Date(task.dueAt),
            fieldName: task.fieldName || loadedFields.find((field) => field.id === task.fieldId)?.name,
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
    if (!taskId || updatingTaskId === taskId) return;

    setUpdatingTaskId(taskId);
    try {
      const res = await fetch(`/api/v1/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'タスク更新に失敗しました');
        return;
      }

      setTasks((prev) => prev.map((task) => (task.id === taskId ? { ...task, status } : task)));
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const deleteField = async (fieldId: string, fieldName: string) => {
    if (!fieldId || deletingFieldId === fieldId) return;

    if (!confirm(`「${fieldName}」を削除しますか？\nこの操作は元に戻せません。`)) return;

    setDeletingFieldId(fieldId);
    try {
      const res = await fetch(`/api/v1/fields/${fieldId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || '圃場の削除に失敗しました');
        return;
      }

      setFields((prev) => prev.filter((field) => field.id !== fieldId));
    } finally {
      setDeletingFieldId(null);
    }
  };

  const getTodayActivities = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return activities.filter((activity) => {
      const activityDate = new Date(activity.timestamp);
      activityDate.setHours(0, 0, 0, 0);
      return activityDate.getTime() === today.getTime();
    });
  };

  const getUpcomingTasks = () => {
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    return tasks
      .filter((task) => task.dueAt >= now && task.dueAt <= nextWeek && task.status === 'pending')
      .map((task) => ({
        ...task,
        status: 'pending' as const,
        fieldName: task.fieldName || fields.find((field) => field.id === task.fieldId)?.name,
      }))
      .sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime())
      .slice(0, 5);
  };

  const getFieldStatus = () =>
    fields.map((field) => ({
      ...field,
      lastActivity: activities
        .filter((activity) => activity.fieldName === field.name)
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0],
    }));

  if (loading) {
    return (
      <div className="surface-base flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="surface-base p-6 text-center">
        <p className="status-critical inline-flex rounded-full px-3 py-1 text-sm font-medium">⚠ {error}</p>
        <div className="mt-4">
          <button
            onClick={() => {
              void fetchDashboardData();
            }}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            再試行
          </button>
        </div>
      </div>
    );
  }

  const todayActivities = getTodayActivities();
  const upcomingTasks = getUpcomingTasks();
  const fieldStatus = getFieldStatus();

  const seasonState = buildSeasonRailState({
    stage: upcomingTasks.length > 0 ? 'vegetative' : 'seedling',
    progress: Math.min(100, Math.round((todayActivities.length / Math.max(todayActivities.length + upcomingTasks.length, 1)) * 100)),
    dayCount: todayActivities.length,
    totalDays: Math.max(upcomingTasks.length, 1),
    windowLabel: 'Daily operations ledger',
    risk: upcomingTasks.length > 4 ? 'warning' : upcomingTasks.length > 1 ? 'watch' : 'safe',
    note:
      upcomingTasks.length > 0
        ? `今週 ${upcomingTasks.length} 件の保留タスクがあります。`
        : '今週の保留タスクはありません。',
  });

  return (
    <div className="space-y-6">
      <SeasonRail state={seasonState} />

      <div className="surface-base p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-foreground">農業活動ダッシュボード</h2>
            <p className="text-sm text-muted-foreground">今日の活動状況と今後の予定を確認</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={onLogActivity}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              活動を記録
            </button>
            <button
              onClick={onScheduleTask}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground hover:bg-secondary/75"
            >
              <Calendar className="h-4 w-4" />
              タスクを予定
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="surface-base p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-secondary p-2 text-secondary-foreground">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-foreground">{todayActivities.length}</p>
              <p className="text-sm text-muted-foreground">今日の活動</p>
            </div>
          </div>
        </div>

        <div className="surface-base p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-secondary p-2 text-secondary-foreground">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-foreground">{upcomingTasks.length}</p>
              <p className="text-sm text-muted-foreground">今週のタスク</p>
            </div>
          </div>
        </div>

        <div className="surface-base p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-secondary p-2 text-secondary-foreground">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-foreground">{fields.length}</p>
              <p className="text-sm text-muted-foreground">管理圃場</p>
            </div>
          </div>
        </div>

        <div className="surface-base p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-secondary p-2 text-secondary-foreground">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-foreground">{activities.filter((activity) => activity.status === 'completed').length}</p>
              <p className="text-sm text-muted-foreground">完了活動</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">最近の活動</h3>
            <button onClick={onViewCalendar} className="text-sm font-semibold text-brand-seedling hover:text-brand-seedling/80">
              カレンダーを見る
            </button>
          </div>
          <div className="surface-base p-3">
            <ActivityFeedCard activities={activities.slice(0, 5)} maxItems={5} showFilters={false} realtime={false} />
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">今後のタスク</h3>
            <button onClick={onScheduleTask} className="text-sm font-semibold text-brand-seedling hover:text-brand-seedling/80">
              新規予定
            </button>
          </div>

          <div className="space-y-3">
            {upcomingTasks.length === 0 ? (
              <ModuleBlueprint
                title="今週の予定されたタスクはありません"
                description="新しい作業を登録すると、ここに優先順で表示されます。"
                tone="safe"
              />
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
        </section>
      </div>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold text-foreground">圃場状況</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
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
                  void deleteField(field.id, field.name);
                }}
              />
            );
          })}
        </div>
      </section>

      {editingField ? (
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
      ) : null}
    </div>
  );
}
