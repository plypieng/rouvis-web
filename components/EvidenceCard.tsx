'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ConfidenceIndicator } from './ConfidenceIndicator';
import { Citation } from '@/types/chat';

interface EvidenceCardProps {
  type: 'citation' | 'confidence' | 'action';
  content: string;
  source?: string;
  confidence?: number;
  citations?: Citation[];
  actionLabel?: string;
  onAction?: () => void;
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

export function EvidenceCard({
  type,
  content,
  source,
  confidence,
  citations = [],
  actionLabel,
  onAction,
  collapsible = true,
  defaultExpanded = false,
}: EvidenceCardProps) {
  const t = useTranslations();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const getCardStyle = () => {
    switch (type) {
      case 'citation':
        return 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-300 text-blue-900';
      case 'confidence':
        return 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-300 text-green-900';
      case 'action':
        return 'bg-gradient-to-br from-orange-50 to-amber-50 border-orange-300 text-orange-900';
      default:
        return 'bg-gradient-to-br from-gray-50 to-slate-50 border-gray-300 text-gray-900';
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

  const getTypeLabel = () => {
    switch (type) {
      case 'citation':
        return t('evidence.citation') || '出典';
      case 'confidence':
        return t('evidence.confidence') || '信頼度';
      case 'action':
        return t('evidence.action') || 'アクション';
      default:
        return '';
    }
  };

  return (
    <div 
      className={`
        rounded-xl border-2 p-4 mb-3 
        ${getCardStyle()} 
        transition-all duration-300 ease-in-out
        hover:shadow-md
        animate-fadeIn
      `}
    >
      <div className="flex items-start space-x-3">
        {/* Icon */}
        <div className="flex-shrink-0">
          <div className="w-10 h-10 rounded-full bg-white bg-opacity-60 flex items-center justify-center shadow-sm">
            <span className="text-xl">{getIcon()}</span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-semibold">{getTypeLabel()}</div>
            {collapsible && citations.length > 0 && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-xs font-medium px-2 py-1 rounded-full bg-white bg-opacity-50 hover:bg-opacity-80 transition-colors flex items-center gap-1"
              >
                <span>{isExpanded ? '閉じる' : '詳細'}</span>
                <svg
                  className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            )}
          </div>

          {/* Main Content */}
          <div className="text-sm leading-relaxed mb-2">{content}</div>

          {/* Source */}
          {source && (
            <div className="flex items-center gap-2 text-xs opacity-80 mb-2">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{t('evidence.source') || 'ソース'}: {source}</span>
            </div>
          )}

          {/* Confidence Indicator */}
          {confidence !== undefined && (
            <div className="my-3">
              <ConfidenceIndicator confidence={confidence} size="md" />
            </div>
          )}

          {/* Collapsible Citations */}
          {citations.length > 0 && (
            <div
              className={`
                overflow-hidden transition-all duration-300 ease-in-out
                ${isExpanded ? 'max-h-96 opacity-100 mt-3' : 'max-h-0 opacity-0'}
              `}
            >
              <div className="space-y-2 pt-3 border-t border-white border-opacity-40">
                <div className="text-xs font-semibold opacity-90 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  <span>{t('evidence.sources') || '出典元'}:</span>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                  {citations.map((citation, index) => (
                    <div
                      key={index}
                      className="bg-white bg-opacity-70 backdrop-blur-sm rounded-lg p-3 shadow-sm border border-white border-opacity-40 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1">
                          <div className="font-medium text-sm">
                            {citation.source}
                            {citation.page && (
                              <span className="ml-2 text-xs opacity-75">(p.{citation.page})</span>
                            )}
                          </div>
                          {citation.type && (
                            <div className="mt-1">
                              <span className="text-xs px-2 py-0.5 bg-white bg-opacity-60 rounded-full">
                                {citation.type === 'jma' && '🌤️ JMA'}
                                {citation.type === 'guidebook' && '📚 ガイドブック'}
                                {citation.type === 'field_data' && '🌾 圃場データ'}
                                {citation.type === 'weather' && '🌦️ 気象'}
                                {citation.type === 'general' && 'ℹ️ 一般'}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex-shrink-0">
                          <ConfidenceIndicator 
                            confidence={citation.confidence} 
                            size="sm" 
                            showLabel={false}
                          />
                          <div className="text-xs text-center font-medium mt-1">
                            {Math.round(citation.confidence * 100)}%
                          </div>
                        </div>
                      </div>
                      {citation.text && (
                        <p className="text-xs opacity-80 leading-relaxed line-clamp-3">
                          {citation.text}
                        </p>
                      )}
                      {citation.url && (
                        <a
                          href={citation.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-flex items-center gap-1 text-xs font-medium hover:underline"
                        >
                          ソースを見る
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Action Button */}
          {actionLabel && onAction && (
            <button
              onClick={onAction}
              className="mt-3 px-4 py-2 text-sm font-medium bg-white rounded-lg border-2 hover:shadow-md transition-all duration-200 active:scale-95 flex items-center gap-2"
            >
              {actionLabel}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}