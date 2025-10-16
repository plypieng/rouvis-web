'use client';

import { useTranslations } from 'next-intl';

interface EvidenceCardProps {
  type: 'citation' | 'confidence' | 'action';
  content: string;
  source?: string;
  confidence?: number;
  actionLabel?: string;
  onAction?: () => void;
}

export function EvidenceCard({
  type,
  content,
  source,
  confidence,
  actionLabel,
  onAction,
}: EvidenceCardProps) {
  const t = useTranslations();

  const getCardStyle = () => {
    switch (type) {
      case 'citation':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'confidence':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'action':
        return 'bg-orange-50 border-orange-200 text-orange-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'citation':
        return '📚';
      case 'confidence':
        return '🎯';
      case 'action':
        return '⚡';
      default:
        return 'ℹ️';
    }
  };

  return (
    <div className={`rounded-lg border p-3 mb-2 ${getCardStyle()}`}>
      <div className="flex items-start space-x-2">
        <span className="text-lg">{getIcon()}</span>
        <div className="flex-1">
          <div className="text-sm font-medium mb-1">
            {type === 'citation' && (t('evidence.citation') || '出典')}
            {type === 'confidence' && (t('evidence.confidence') || '信頼度')}
            {type === 'action' && (t('evidence.action') || 'アクション')}
          </div>

          <div className="text-sm">{content}</div>

          {source && (
            <div className="text-xs mt-1 opacity-75">
              {t('evidence.source') || 'ソース'}: {source}
            </div>
          )}

          {confidence !== undefined && (
            <div className="text-xs mt-1">
              {t('evidence.confidence_level') || '信頼度'}: {Math.round(confidence * 100)}%
            </div>
          )}

          {actionLabel && onAction && (
            <button
              onClick={onAction}
              className="mt-2 px-3 py-1 text-xs bg-white rounded border hover:bg-gray-50 transition-colors"
            >
              {actionLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}