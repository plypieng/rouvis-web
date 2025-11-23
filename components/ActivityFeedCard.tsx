'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Activity, RefreshCw, Filter, ChevronDown, ChevronUp } from 'lucide-react';

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

interface ActivityFeedCardProps {
  activities?: ActivityItem[];
  onFetchActivities?: () => Promise<ActivityItem[]>;
  maxItems?: number;
  showFilters?: boolean;
  realtime?: boolean;
}

export function ActivityFeedCard({
  activities: initialActivities,
  onFetchActivities,
  maxItems = 10,
  showFilters = true,
  realtime = true,
}: ActivityFeedCardProps) {
  const t = useTranslations();
  const [activities, setActivities] = useState<ActivityItem[]>(initialActivities || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [filter, setFilter] = useState<'all' | 'today' | 'week'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  useEffect(() => {
    if (!initialActivities && onFetchActivities) {
      fetchActivities();
    }
  }, [initialActivities, onFetchActivities]);

  useEffect(() => {
    if (realtime) {
      const interval = setInterval(fetchActivities, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [realtime]);

  const fetchActivities = async () => {
    if (!onFetchActivities) return;

    setLoading(true);
    setError(null);
    try {
      const fetchedActivities = await onFetchActivities();
      setActivities(fetchedActivities);
    } catch (err) {
      console.error('Failed to fetch activities:', err);
      setError('活動履歴の読み込みに失敗しました');
    } finally {
      setLoading(false);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600';
      case 'pending':
        return 'text-yellow-600';
      case 'cancelled':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const filterActivities = (activities: ActivityItem[]) => {
    let filtered = activities;

    // Time filter
    const now = new Date();
    switch (filter) {
      case 'today':
        filtered = filtered.filter(activity => {
          const activityDate = new Date(activity.timestamp);
          return activityDate.toDateString() === now.toDateString();
        });
        break;
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        filtered = filtered.filter(activity => activity.timestamp >= weekAgo);
        break;
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(activity => activity.type === typeFilter);
    }

    return filtered.slice(0, expanded ? undefined : maxItems);
  };

  const filteredActivities = filterActivities(activities);

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
    <div className="bg-gradient-to-br from-slate-50 to-gray-50 border-2 border-gray-200 rounded-lg p-4 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">活動履歴</h3>
          {loading && <RefreshCw className="w-4 h-4 animate-spin text-gray-500" />}
        </div>
        <div className="flex items-center gap-2">
          {realtime && (
            <button
              onClick={fetchActivities}
              disabled={loading}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
              title="更新"
            >
              <RefreshCw className="w-4 h-4 text-gray-500" />
            </button>
          )}
          {activities.length > maxItems && (
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
      {showFilters && activities.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4 p-3 bg-white bg-opacity-60 rounded-lg">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="text-sm border border-gray-300 rounded px-2 py-1 bg-white"
            >
              <option value="all">すべて</option>
              <option value="today">今日</option>
              <option value="week">今週</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="text-sm border border-gray-300 rounded px-2 py-1 bg-white"
            >
              <option value="all">すべての種類</option>
              <option value="watering">水やり</option>
              <option value="fertilizing">肥料投入</option>
              <option value="harvesting">収穫</option>
              <option value="planting">植え付け</option>
              <option value="maintenance">メンテナンス</option>
            </select>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="text-center py-4">
          <div className="text-red-600 mb-2">⚠️ {error}</div>
          <button
            onClick={fetchActivities}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            再試行
          </button>
        </div>
      )}

      {/* Activities List */}
      {!error && (
        <div className="space-y-3">
          {filteredActivities.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {loading ? '読み込み中...' : '活動履歴がありません'}
            </div>
          ) : (
            filteredActivities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start gap-3 p-3 bg-white bg-opacity-70 rounded-lg border border-gray-100 hover:shadow-sm transition-shadow"
              >
                <div className="flex-shrink-0">
                  <span className="text-lg">{getActivityIcon(activity.type)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-gray-900 text-sm">
                      {getActivityLabel(activity.type)}
                    </span>
                    <span className={`text-xs ${getStatusColor(activity.status)}`}>
                      {activity.status === 'completed' ? '完了' :
                       activity.status === 'pending' ? '保留中' : 'キャンセル'}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    {activity.fieldName && (
                      <div>圃場: <span className="font-medium">{activity.fieldName}</span></div>
                    )}
                    {activity.quantity && activity.unit && (
                      <div>量: <span className="font-medium">{activity.quantity} {activity.unit}</span></div>
                    )}
                    {activity.note && (
                      <div className="text-xs opacity-80 line-clamp-2">{activity.note}</div>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {formatRelativeTime(activity.timestamp)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Show More/Less */}
      {activities.length > maxItems && (
        <div className="text-center mt-4">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            {expanded ? '一部を表示' : `${activities.length - maxItems}件をもっと見る`}
          </button>
        </div>
      )}
    </div>
  );
}