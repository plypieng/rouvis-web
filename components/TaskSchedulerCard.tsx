'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Calendar, Clock, MapPin, CheckCircle, XCircle } from 'lucide-react';

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

interface TaskSchedulerCardProps {
  task: Task;
  onConfirm?: () => void;
  onCancel?: () => void;
  onEdit?: () => void;
}

export function TaskSchedulerCard({
  task,
  onConfirm,
  onCancel,
  onEdit,
}: TaskSchedulerCardProps) {
  const t = useTranslations();
  const [isExpanded, setIsExpanded] = useState(false);

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
        return <Calendar className="w-5 h-5 text-blue-600" />;
    }
  };

  const formatDateTime = (date: Date) => {
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isOverdue = task.dueAt < new Date() && task.status === 'pending';

  if (task.status === 'scheduled') {
    return (
      <div className={`rounded-xl border-2 p-4 mb-3 ${getStatusColor(task.status)} animate-fadeIn`}>
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            {getStatusIcon(task.status)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold flex items-center gap-2">
                <span>📅</span>
                <span>タスク予定</span>
              </div>
              {onEdit && (
                <button
                  onClick={onEdit}
                  className="text-xs px-3 py-1 bg-white rounded-lg border hover:shadow-sm transition-all"
                >
                  編集
                </button>
              )}
            </div>
            <div className="text-sm font-medium text-gray-900 mb-2">{task.title}</div>
            <div className="text-sm text-gray-700 space-y-1">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-500" />
                <span>{formatDateTime(task.dueAt)}</span>
              </div>
              {task.fieldName && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gray-500" />
                  <span>{task.fieldName}</span>
                </div>
              )}
              {task.priority && (
                <div className="inline-flex items-center gap-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getPriorityColor(task.priority)}`}>
                    優先度: {getPriorityLabel(task.priority)}
                  </span>
                </div>
              )}
            </div>
            {task.description && (
              <div className="text-sm text-gray-600 mt-2 p-2 bg-white bg-opacity-50 rounded">
                {task.description}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (task.status === 'cancelled') {
    return (
      <div className={`rounded-xl border-2 p-4 mb-3 ${getStatusColor(task.status)} animate-fadeIn`}>
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            {getStatusIcon(task.status)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold flex items-center gap-2 mb-2">
              <span>📅</span>
              <span>タスクキャンセル</span>
            </div>
            <div className="text-sm text-gray-700">
              <span className="font-medium">{task.title}</span> はキャンセルされました
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Pending status - confirmation needed
  return (
    <div className={`rounded-xl border-2 p-4 mb-3 ${getStatusColor(task.status)} animate-fadeIn ${isOverdue ? 'ring-2 ring-red-300' : ''}`}>
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          {getStatusIcon(task.status)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-semibold flex items-center gap-2">
              <span>📅</span>
              <span>タスクの確認</span>
            </div>
            {isOverdue && (
              <span className="text-xs px-2 py-1 bg-red-100 text-red-800 rounded-full font-medium">
                期限切れ
              </span>
            )}
          </div>

          <div className="text-sm font-medium text-gray-900 mb-2">{task.title}</div>

          <div className="text-sm text-gray-700 space-y-1 mb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-500" />
              <span>{formatDateTime(task.dueAt)}</span>
            </div>
            {task.fieldName && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-500" />
                <span>{task.fieldName}</span>
              </div>
            )}
            {task.priority && (
              <div className="inline-flex items-center gap-1">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getPriorityColor(task.priority)}`}>
                  優先度: {getPriorityLabel(task.priority)}
                </span>
              </div>
            )}
          </div>

          {task.description && (
            <div className="text-sm text-gray-600 mb-3 p-2 bg-white bg-opacity-50 rounded">
              {task.description}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={onConfirm}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              予定する
            </button>
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium flex items-center gap-2"
            >
              <XCircle className="w-4 h-4" />
              キャンセル
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}