'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Activity, Calendar, MapPin, TrendingUp, Clock, Plus } from 'lucide-react';
import { ActivityFeedCard } from './ActivityFeedCard';
import { TaskSchedulerCard } from './TaskSchedulerCard';
import { FieldCard } from './FieldCard';

interface ActivityItem {
  id: string;
  type: 'watering' | 'fertilizing' | 'harvesting' | 'planting' | 'maintenance';
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
  status: 'pending' | 'scheduled' | 'cancelled';
}

interface Field {
  id: string;
  name: string;
  crop?: string;
  // Align with FieldCard expectations
  area_sqm?: number;
  geojson?: any;
  created_at?: string;
  updated_at?: string;
  location?: string;
}

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
  const t = useTranslations();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Fetch fields first to allow mapping
      let loadedFields: Field[] = [];
      const fieldsResponse = await fetch('/api/v1/fields');
      if (fieldsResponse.ok) {
        const fieldsData = await fieldsResponse.json();
        loadedFields = fieldsData.fields || [];
        setFields(loadedFields);
      }

      // 2. Fetch activities
      const activitiesResponse = await fetch('/api/v1/activities');
      if (activitiesResponse.ok) {
        const activitiesData = await activitiesResponse.json();
        const parsedActivities = (activitiesData.activities || []).map((activity: any) => ({
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
          const tasksData = await tasksResponse.json();
          const parsedTasks = (tasksData.tasks || []).map((task: any) => ({
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
                    // TODO: Implement task confirmation
                    console.log('Confirm task:', task.id);
                  }}
                  onCancel={() => {
                    // TODO: Implement task cancellation
                    console.log('Cancel task:', task.id);
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
            const safeField = {
              id: field.id,
              name: field.name,
              crop: field.crop,
              area_sqm: field.area_sqm,
              geojson: field.geojson ?? {},
              created_at: field.created_at ?? new Date().toISOString(),
              updated_at: field.updated_at ?? new Date().toISOString(),
            };
            return (
              <FieldCard
                key={field.id}
                field={safeField}
                viewMode="grid"
                onEdit={() => {
                  // TODO: Implement field edit navigation
                  console.log('Edit field:', field.id);
                }}
                onDelete={() => {
                  // TODO: Implement field delete flow
                  console.log('Delete field:', field.id);
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}