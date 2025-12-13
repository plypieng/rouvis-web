'use client';

import { useState } from 'react';
import { RAGContext, Citation } from '@/types/chat';

interface RAGContextBadgeProps {
  context: RAGContext;
  citations?: Citation[];
  className?: string;
}

export function RAGContextBadge({ context, citations = [], className = '' }: RAGContextBadgeProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Get relevance color
  const getRelevanceColor = (score: number) => {
    if (score >= 0.8) return 'bg-green-100 border-green-400 text-green-800';
    if (score >= 0.6) return 'bg-yellow-100 border-yellow-400 text-yellow-800';
    return 'bg-gray-100 border-gray-400 text-gray-800';
  };

  const relevanceColor = getRelevanceColor(context.relevanceScore);

  return (
    <div className={`inline-block ${className}`}>
      {/* Compact Badge */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`
          inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border
          ${relevanceColor}
          text-xs font-medium transition-all duration-200
          hover:shadow-md hover:scale-105 active:scale-95
        `}
      >
        <span className="text-sm">📚</span>
        <span>ガイドブック</span>
        {context.chunks > 0 && (
          <span className="ml-1 px-1.5 py-0.5 bg-white bg-opacity-50 rounded-full text-xs">
            {context.chunks}
          </span>
        )}
        <svg
          className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="mt-2 p-3 bg-white rounded-lg shadow-lg border border-gray-200 animate-fadeIn">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">📚</span>
              <span className="font-semibold text-sm text-gray-900">
                RAG検索結果
              </span>
            </div>
            <button
              onClick={() => setIsExpanded(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="p-2 bg-gray-50 rounded">
              <div className="text-xs text-gray-600">マッチ数</div>
              <div className="text-sm font-bold text-gray-900">{context.chunks}</div>
            </div>
            <div className="p-2 bg-gray-50 rounded">
              <div className="text-xs text-gray-600">関連性</div>
              <div className="text-sm font-bold text-gray-900">
                {Math.round(context.relevanceScore * 100)}%
              </div>
            </div>
          </div>

          {/* Guidebooks List */}
          {context.guidebooks.length > 0 && (
            <div className="mb-3">
              <div className="text-xs font-medium text-gray-700 mb-1">参照元</div>
              <div className="space-y-1">
                {context.guidebooks.map((guidebook, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-2 bg-green-50 rounded text-xs"
                  >
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="flex-1 text-gray-700">{guidebook}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Citations */}
          {citations.length > 0 && (
            <div>
              <div className="text-xs font-medium text-gray-700 mb-1">引用</div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {citations
                  .filter(c => c.type === 'guidebook')
                  .map((citation, index) => (
                    <div
                      key={index}
                      className="p-2 bg-blue-50 border border-blue-200 rounded text-xs"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-blue-900">
                          {citation.source}
                          {citation.page && ` (p.${citation.page})`}
                        </span>
                        <span className="text-blue-700 font-medium">
                          {Math.round(citation.confidence * 100)}%
                        </span>
                      </div>
                      {citation.text && (
                        <p className="text-gray-700 line-clamp-2">{citation.text}</p>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Info Footer */}
          <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-500 flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Pineconeベクトル検索による情報取得</span>
          </div>
        </div>
      )}
    </div>
  );
}
