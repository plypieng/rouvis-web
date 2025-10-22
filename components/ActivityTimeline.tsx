'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Activity, Clock, MapPin, ChevronDown, ChevronUp, Filter } from 'lucide-react';

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

interface TimelineItem {
  id: string;
  type: 'activity' | 'task';
  timestamp: Date;
  data: ActivityItem | Task;
}

interface ActivityTimelineProps {
  activities?: ActivityItem[];
  tasks?: Task[];
  onFetchActivities?: () => Promise<ActivityItem[]>;
  onFetchTasks?: () => Promise<Task[]>;
  maxItems?: number;
  showFilters?: boolean;
  realtime?: boolean;
}

export function ActivityTimeline({
  activities: initialActivities,
  tasks: initialTasks,
  onFetchActivities,
  onFetchTasks,
  maxItems = 20,
  showFilters = true,
  realtime = true,
}: ActivityTimelineProps) {
  const t = useTranslations();
  const [activities, setActivities] = useState<ActivityItem[]>(initialActivities || []);
  const [tasks, setTasks] = useState<Task[]>(initialTasks || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [filter, setFilter] = useState<'all' | 'activities' | 'tasks'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');

  useEffect(() => {
    if (!initialActivities && onFetchActivities) {
      fetchActivities();
    }
    if (!initialTasks && onFetchTasks) {
      fetchTasks();
    }
  }, [initialActivities, initialTasks, onFetchActivities, onFetchTasks]);

  useEffect(() => {
    if (realtime) {
      const interval = setInterval(() => {
        if (onFetchActivities) fetchActivities();
        if (onFetchTasks) fetchTasks();
      }, 60000); // Refresh every minute
      return () => clearInterval(interval);
    }
  }, [realtime, onFetchActivities, onFetchTasks]);

  const fetchActivities = async () => {
    if (!onFetchActivities) return;
    try {
      const fetchedActivities = await onFetchActivities();
      setActivities(fetchedActivities);
    } catch (err) {
      console.error('Failed to fetch activities:', err);
    }
  };

  const fetchTasks = async () => {
    if (!onFetchTasks) return;
    try {
      const fetchedTasks = await onFetchTasks();
      setTasks(fetchedTasks);
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'watering':
        return '💧';
      case 'fertilizing':
        return '🌱';
      case 'harvesting':
        return '🚜';
      case 'planting':
        return '🌾';
      case 'maintenance':
        return '🔧';
      default:
        return '⚡';
    }
  };

  const getActivityLabel = (type: string) => {
    const labels = {
      watering: '水やり',
      fertilizing: '肥料投入',
      harvesting: '収穫',
      planting: '植え付け',
      maintenance: 'メンテナンス',
    };
    return labels[type as keyof typeof labels] || type;
  };

  const getStatusColor = (status: string, type: 'activity' | 'task') => {
    if (type === 'task') {
      switch (status) {
        case 'scheduled':
          return 'text-blue-600';
        case 'cancelled':
          return 'text-red-600';
        default:
          return 'text-yellow-600';
      }
    } else {
      switch (status) {
        case 'completed':
          return 'text-green-600';
        case 'cancelled':
          return 'text-red-600';
        default:
          return 'text-yellow-600';
      }
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-green-100 text-green-800';
    }
  };

  const getPriorityLabel = (priority?: string) => {
    const labels = {
      high: '高',
      medium: '中',
      low: '低',
    };
    return labels[priority as keyof typeof labels] || '低';
  };

  // Combine and sort timeline items
  const createTimelineItems = (): TimelineItem[] => {
    const items: TimelineItem[] = [];

    // Add activities
    if (filter === 'all' || filter === 'activities') {
      activities.forEach(activity => {
        items.push({
          id: `activity-${activity.id}`,
          type: 'activity',
          timestamp: activity.timestamp,
          data: activity,
        });
      });
    }

    // Add tasks
    if (filter === 'all' || filter === 'tasks') {
      tasks.forEach(task => {
        items.push({
          id: `task-${task.id}`,
          type: 'task',
          timestamp: task.dueAt,
          data: task,
        });
      });
    }

    // Filter by date
    const now = new Date();
    let filteredItems = items;

    switch (dateFilter) {
      case 'today':
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        filteredItems = items.filter(item => item.timestamp >= today);
        break;
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        filteredItems = items.filter(item => item.timestamp >= weekAgo);
        break;
      case 'month':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        filteredItems = items.filter(item => item.timestamp >= monthAgo);
        break;
    }

    // Sort by timestamp (most recent first)
    return filteredItems.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  };

  const timelineItems = createTimelineItems();
  const displayedItems = expanded ? timelineItems : timelineItems.slice(0, maxItems);

  const formatTime = (date: Date) => {
    return date.toLocaleString('ja-JP', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'たった今';
    if (diffMins < 60) return `${diffMins}分前`;
    if (diffHours < 24) return `${diffHours}時間前`;
    if (diffDays < 7) return `${diffDays}日前`;

    return formatTime(date);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">活動タイムライン</h3>
        </div>
        <div className="flex items-center gap-2">
          {timelineItems.length > maxItems && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              {expanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      {showFilters && (activities.length > 0 || tasks.length > 0) && (
        <div className="flex flex-wrap gap-2 mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="text-sm border border-gray-300 rounded px-2 py-1 bg-white"
            >
              <option value="all">すべて</option>
              <option value="activities">活動のみ</option>
              <option value="tasks">タスクのみ</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="text-sm border border-gray-300 rounded px-2 py-1 bg-white"
            >
              <option value="all">全期間</option>
              <option value="today">今日</option>
              <option value="week">今週</option>
              <option value="month">今月</option>
            </select>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="space-y-4">
        {displayedItems.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {loading ? '読み込み中...' : 'タイムラインに項目がありません'}
          </div>
        ) : (
          displayedItems.map((item, index) => (
            <div key={item.id} className="relative">
              {/* Timeline line */}
              {index < displayedItems.length - 1 && (
                <div className="absolute left-6 top-12 w-0.5 h-full bg-gray-200"></div>
              )}

              <div className="flex items-start gap-4">
                {/* Timeline dot */}
                <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
                  item.type === 'activity' ? 'bg-green-100' : 'bg-blue-100'
                }`}>
                  {item.type === 'activity' ? (
                    <span className="text-lg">{getActivityIcon((item.data as ActivityItem).type)}</span>
                  ) : (
                    <Clock className="w-5 h-5 text-blue-600" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pb-8">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {item.type === 'activity' ? (
                          <span className="font-medium text-gray-900">
                            {getActivityLabel((item.data as ActivityItem).type)}
                          </span>
                        ) : (
                          <span className="font-medium text-gray-900">
                            {(item.data as Task).title}
                          </span>
                        )}
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          item.type === 'activity'
                            ? getStatusColor((item.data as ActivityItem).status, 'activity')
                            : getStatusColor((item.data as Task).status, 'task')
                        } bg-current bg-opacity-10`}>
                          {item.type === 'activity'
                            ? ((item.data as ActivityItem).status === 'completed' ? '完了' :
                               (item.data as ActivityItem).status === 'pending' ? '保留中' : 'キャンセル')
                            : ((item.data as Task).status === 'scheduled' ? '予定' :
                               (item.data as Task).status === 'pending' ? '未定' : 'キャンセル')
                          }
                        </span>
                        {item.type === 'task' && (item.data as Task).priority && (
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${getPriorityColor((item.data as Task).priority)}`}>
                            優先度: {getPriorityLabel((item.data as Task).priority)}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">
                        {formatRelativeTime(item.timestamp)}
                      </span>
                    </div>

                    <div className="text-sm text-gray-600 space-y-1">
                      {item.type === 'activity' ? (
                        <>
                          {(item.data as ActivityItem).fieldName && (
                            <div className="flex items-center gap-2">
                              <MapPin className="w-3 h-3" />
                              <span>圃場: {(item.data as ActivityItem).fieldName}</span>
                            </div>
                          )}
                          {(item.data as ActivityItem).quantity && (item.data as ActivityItem).unit && (
                            <div>量: {(item.data as ActivityItem).quantity} {(item.data as ActivityItem).unit}</div>
                          )}
                          {(item.data as ActivityItem).note && (
                            <div className="text-xs opacity-80 line-clamp-2">{(item.data as ActivityItem).note}</div>
                          )}
                        </>
                      ) : (
                        <>
                          {(item.data as Task).fieldName && (
                            <div className="flex items-center gap-2">
                              <MapPin className="w-3 h-3" />
                              <span>圃場: {(item.data as Task).fieldName}</span>
                            </div>
                          )}
                          {(item.data as Task).description && (
                            <div className="text-xs opacity-80 line-clamp-2">{(item.data as Task).description}</div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Show More/Less */}
      {timelineItems.length > maxItems && (
        <div className="text-center mt-4">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            {expanded ? '一部を表示' : `${timelineItems.length - maxItems}件をもっと見る`}
          </button>
        </div>
      )}
    </div>
  );
}