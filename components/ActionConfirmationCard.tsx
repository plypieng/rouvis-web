'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { CheckCircle, XCircle, Undo2, Clock } from 'lucide-react';

interface Activity {
  id?: string;
  type: 'watering' | 'fertilizing' | 'harvesting' | 'planting' | 'maintenance';
  fieldName?: string;
  quantity?: number;
  unit?: string;
  note?: string;
  timestamp: Date;
  status: 'pending' | 'confirmed' | 'cancelled';
}

interface ActionConfirmationCardProps {
  activity: Activity;
  onConfirm?: () => void;
  onUndo?: () => void;
  onCancel?: () => void;
  autoConfirmDelay?: number; // seconds
}

export function ActionConfirmationCard({
  activity,
  onConfirm,
  onUndo,
  onCancel,
  autoConfirmDelay = 10,
}: ActionConfirmationCardProps) {
  const t = useTranslations();
  const [timeLeft, setTimeLeft] = useState(autoConfirmDelay);
  const [isAutoConfirming, setIsAutoConfirming] = useState(true);

  // Auto-confirm countdown
  React.useEffect(() => {
    if (activity.status !== 'pending' || !isAutoConfirming) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          onConfirm?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [activity.status, isAutoConfirming, onConfirm]);

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
      case 'confirmed':
        return 'bg-green-50 border-green-300 text-green-900';
      case 'cancelled':
        return 'bg-red-50 border-red-300 text-red-900';
      default:
        return 'bg-blue-50 border-blue-300 text-blue-900';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'cancelled':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Clock className="w-5 h-5 text-blue-600" />;
    }
  const handleUndo = async () => {
    if (!activity.id) return;

    try {
      // Call undo API endpoint
      const response = await fetch(`/api/v1/activities/${activity.id}/undo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'demo-user', // TODO: Get from auth
        },
      });

      if (!response.ok) {
        throw new Error('Failed to undo activity');
      }

      // Update local state
      onUndo?.();
    } catch (error) {
      console.error('Failed to undo activity:', error);
      alert('活動の取り消しに失敗しました');
    }
  };
  };

  if (activity.status === 'confirmed') {
    return (
      <div className={`rounded-xl border-2 p-4 mb-3 ${getStatusColor(activity.status)} animate-fadeIn`}>
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            {getStatusIcon(activity.status)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold flex items-center gap-2">
                <span>{getActivityIcon(activity.type)}</span>
                <span>{getActivityLabel(activity.type)}完了</span>
              </div>
              {onUndo && (
                <button
                  onClick={onUndo}
                  className="text-xs px-3 py-1 bg-white rounded-lg border hover:shadow-sm transition-all flex items-center gap-1"
                >
                  <Undo2 className="w-3 h-3" />
                  取り消し
                </button>
              )}
            </div>
            <div className="text-sm text-gray-700 space-y-1">
              {activity.fieldName && (
                <div>圃場: <span className="font-medium">{activity.fieldName}</span></div>
              )}
              {activity.quantity && activity.unit && (
                <div>量: <span className="font-medium">{activity.quantity} {activity.unit}</span></div>
              )}
              {activity.note && (
                <div>メモ: <span className="font-medium">{activity.note}</span></div>
              )}
            </div>
            <div className="text-xs text-gray-500 mt-2">
              {activity.timestamp.toLocaleString('ja-JP')}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (activity.status === 'cancelled') {
    return (
      <div className={`rounded-xl border-2 p-4 mb-3 ${getStatusColor(activity.status)} animate-fadeIn`}>
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            {getStatusIcon(activity.status)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold flex items-center gap-2 mb-2">
              <span>{getActivityIcon(activity.type)}</span>
              <span>{getActivityLabel(activity.type)}キャンセル</span>
            </div>
            <div className="text-sm text-gray-700">
              この作業はキャンセルされました
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Pending status - confirmation needed
  return (
    <div className={`rounded-xl border-2 p-4 mb-3 ${getStatusColor(activity.status)} animate-fadeIn`}>
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          {getStatusIcon(activity.status)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-semibold flex items-center gap-2">
              <span>{getActivityIcon(activity.type)}</span>
              <span>{getActivityLabel(activity.type)}の確認</span>
            </div>
            {isAutoConfirming && timeLeft > 0 && (
              <div className="text-xs text-blue-700 bg-blue-100 px-2 py-1 rounded-full">
                {timeLeft}秒後に自動確定
              </div>
            )}
          </div>

          <div className="text-sm text-gray-700 space-y-1 mb-3">
            {activity.fieldName && (
              <div>圃場: <span className="font-medium">{activity.fieldName}</span></div>
            )}
            {activity.quantity && activity.unit && (
              <div>量: <span className="font-medium">{activity.quantity} {activity.unit}</span></div>
            )}
            {activity.note && (
              <div>メモ: <span className="font-medium">{activity.note}</span></div>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => {
                setIsAutoConfirming(false);
                onConfirm?.();
              }}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              確定
            </button>
            <button
              onClick={() => {
                setIsAutoConfirming(false);
                onCancel?.();
              }}
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