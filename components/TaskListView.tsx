'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { CheckCircle, Clock, XCircle, MapPin, Calendar, Filter, SortAsc, SortDesc, AlertTriangle } from 'lucide-react';

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

interface TaskListViewProps {
  tasks?: Task[];
  onFetchTasks?: () => Promise<Task[]>;
  onTaskConfirm?: (taskId: string) => void;
  onTaskCancel?: (taskId: string) => void;
  onTaskEdit?: (task: Task) => void;
  showFilters?: boolean;
  realtime?: boolean;
}

export function TaskListView({
  tasks: initialTasks,
  onFetchTasks,
  onTaskConfirm,
  onTaskCancel,
  onTaskEdit,
  showFilters = true,
  realtime = true,
}: TaskListViewProps) {
  const t = useTranslations();
  const [tasks, setTasks] = useState<Task[]>(initialTasks || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'scheduled' | 'overdue'>('all');
  const [sortBy, setSortBy] = useState<'dueAt' | 'priority' | 'title'>('dueAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'low' | 'medium' | 'high'>('all');

  useEffect(() => {
    if (!initialTasks && onFetchTasks) {
      fetchTasks();
    }
  }, [initialTasks, onFetchTasks]);

  useEffect(() => {
    if (realtime && onFetchTasks) {
      const interval = setInterval(fetchTasks, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [realtime, onFetchTasks]);

  const fetchTasks = async () => {
    if (!onFetchTasks) return;

    setLoading(true);
    setError(null);
    try {
      const fetchedTasks = await onFetchTasks();
      setTasks(fetchedTasks);
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
      setError('タスクの読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-green-100 text-green-800 border-green-200';
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-green-50 border-green-300 text-green-900';
      case 'cancelled':
        return 'bg-red-50 border-red-300 text-red-900';
      default:
        return 'bg-blue-50 border-blue-300 text-blue-900';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'cancelled':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Clock className="w-5 h-5 text-blue-600" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'scheduled':
        return '予定済み';
      case 'cancelled':
        return 'キャンセル';
      default:
        return '未定';
    }
  };

  const isOverdue = (task: Task) => {
    return task.dueAt < new Date() && task.status === 'pending';
  };

  const filterAndSortTasks = (tasks: Task[]) => {
    let filtered = tasks;

    // Status filter
    switch (filter) {
      case 'pending':
        filtered = filtered.filter(task => task.status === 'pending');
        break;
      case 'scheduled':
        filtered = filtered.filter(task => task.status === 'scheduled');
        break;
      case 'overdue':
        filtered = filtered.filter(task => isOverdue(task));
        break;
    }

    // Priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(task => task.priority === priorityFilter);
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case 'dueAt':
          aValue = a.dueAt.getTime();
          bValue = b.dueAt.getTime();
          break;
        case 'priority':
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          aValue = priorityOrder[a.priority || 'low'] || 1;
          bValue = priorityOrder[b.priority || 'low'] || 1;
          break;
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        default:
          return 0;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  };

  const filteredTasks = filterAndSortTasks(tasks);

  const formatDateTime = (date: Date) => {
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffMins = Math.floor(Math.abs(diffMs) / (1000 * 60));
    const diffHours = Math.floor(Math.abs(diffMs) / (1000 * 60 * 60));
    const diffDays = Math.floor(Math.abs(diffMs) / (1000 * 60 * 60 * 24));

    if (diffMs < 0) {
      if (diffMins < 60) return `${diffMins}分前`;
      if (diffHours < 24) return `${diffHours}時間前`;
      return `${diffDays}日前`;
    } else {
      if (diffMins < 60) return `${diffMins}分後`;
      if (diffHours < 24) return `${diffHours}時間後`;
      return `${diffDays}日後`;
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">タスク一覧</h3>
          {loading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>}
        </div>
      </div>

      {/* Filters and Sort */}
      {showFilters && tasks.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="text-sm border border-gray-300 rounded px-2 py-1 bg-white"
            >
              <option value="all">すべて</option>
              <option value="pending">未定</option>
              <option value="scheduled">予定済み</option>
              <option value="overdue">期限切れ</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as any)}
              className="text-sm border border-gray-300 rounded px-2 py-1 bg-white"
            >
              <option value="all">すべての優先度</option>
              <option value="high">高</option>
              <option value="medium">中</option>
              <option value="low">低</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-sm border border-gray-300 rounded px-2 py-1 bg-white"
            >
              <option value="dueAt">期限日時</option>
              <option value="priority">優先度</option>
              <option value="title">タイトル</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="p-1 hover:bg-gray-200 rounded"
            >
              {sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="text-center py-4">
          <div className="text-red-600 mb-2">⚠️ {error}</div>
          <button
            onClick={fetchTasks}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            再試行
          </button>
        </div>
      )}

      {/* Tasks List */}
      {!error && (
        <div className="space-y-3">
          {filteredTasks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {loading ? '読み込み中...' : '該当するタスクがありません'}
            </div>
          ) : (
            filteredTasks.map((task) => (
              <div
                key={task.id || `task-${task.title}`}
                className={`rounded-xl border-2 p-4 ${getStatusColor(task.status)} ${isOverdue(task) ? 'ring-2 ring-red-300' : ''} animate-fadeIn`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-shrink-0">
                      {getStatusIcon(task.status)}
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{task.title}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(task.status)}`}>
                          {getStatusLabel(task.status)}
                        </span>
                        {task.priority && (
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${getPriorityColor(task.priority)}`}>
                            優先度: {getPriorityLabel(task.priority)}
                          </span>
                        )}
                        {isOverdue(task) && (
                          <span className="text-xs px-2 py-1 bg-red-100 text-red-800 rounded-full font-medium flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            期限切れ
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {onTaskEdit && task.status === 'pending' && (
                    <button
                      onClick={() => onTaskEdit(task)}
                      className="text-xs px-3 py-1 bg-white rounded-lg border hover:shadow-sm transition-all"
                    >
                      編集
                    </button>
                  )}
                </div>

                <div className="text-sm text-gray-700 space-y-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span>{formatDateTime(task.dueAt)}</span>
                    <span className="text-gray-500">({formatRelativeTime(task.dueAt)})</span>
                  </div>

                  {task.fieldName && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-500" />
                      <span>{task.fieldName}</span>
                    </div>
                  )}

                  {task.description && (
                    <div className="text-gray-600 bg-white bg-opacity-50 p-2 rounded">
                      {task.description}
                    </div>
                  )}
                </div>

                {/* Actions for pending tasks */}
                {task.status === 'pending' && (onTaskConfirm || onTaskCancel) && (
                  <div className="flex gap-2 mt-3">
                    {onTaskConfirm && (
                      <button
                        onClick={() => onTaskConfirm(task.id!)}
                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4" />
                        予定する
                      </button>
                    )}
                    {onTaskCancel && (
                      <button
                        onClick={() => onTaskCancel(task.id!)}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium flex items-center gap-2"
                      >
                        <XCircle className="w-4 h-4" />
                        キャンセル
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}