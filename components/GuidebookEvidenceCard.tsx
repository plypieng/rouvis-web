'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

/**
 * Guidebook Citation Evidence Card
 *
 * Displays citations from Japanese farming guidebooks with:
 * - Source PDF name (e.g., "葉茎菜類.pdf")
 * - Page number in Japanese format (e.g., "12ページ")
 * - Confidence score as percentage with color coding
 * - Text excerpt (first 200 chars by default)
 * - Expandable full text view
 *
 * Design principles:
 * - Japanese-first typography (Noto Sans JP)
 * - Confidence-based color coding (green >80%, yellow 60-80%, gray <60%)
 * - Touch-friendly interactions
 * - Natural, farmer-friendly language
 */

export interface GuidebookCitation {
  source: string;        // PDF filename, e.g., "葉茎菜類.pdf"
  page: number;          // Page number
  confidence: number;    // 0-1 scale
  excerpt: string;       // Short excerpt (first 200 chars)
  fullText?: string;     // Complete passage (optional)
  metadata?: {
    guidebook?: string;  // Friendly guidebook name
    section?: string;    // Section within guidebook
    topic?: string;      // Topic/subject area
  };
}

export interface GuidebookEvidenceCardProps {
  citation: GuidebookCitation;
  className?: string;
  defaultExpanded?: boolean;
  style?: React.CSSProperties;
}

export function GuidebookEvidenceCard({
  citation,
  className = '',
  defaultExpanded = false,
  style,
}: GuidebookEvidenceCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const confidencePercent = Math.round(citation.confidence * 100);

  // Color coding based on confidence level
  const getConfidenceColor = () => {
    if (citation.confidence > 0.8) {
      return {
        text: 'text-green-700',
        bg: 'bg-green-50',
        border: 'border-green-200',
        badgeBg: 'bg-green-100',
        badgeText: 'text-green-800',
      };
    } else if (citation.confidence > 0.6) {
      return {
        text: 'text-yellow-700',
        bg: 'bg-yellow-50',
        border: 'border-yellow-200',
        badgeBg: 'bg-yellow-100',
        badgeText: 'text-yellow-800',
      };
    } else {
      return {
        text: 'text-gray-700',
        bg: 'bg-gray-50',
        border: 'border-gray-200',
        badgeBg: 'bg-gray-100',
        badgeText: 'text-gray-800',
      };
    }
  };

  const colors = getConfidenceColor();
  const hasFullText = citation.fullText && citation.fullText.length > citation.excerpt.length;

  // Extract friendly guidebook name from metadata or filename
  const displayName = citation.metadata?.guidebook || citation.source;

  return (
    <div
      className={`
        border rounded-lg p-4 transition-all duration-200
        ${colors.bg} ${colors.border} hover:shadow-md
        ${className}
      `}
      style={style}
    >
      {/* Header with icon and source info */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Guidebook icon */}
          <div className="flex-shrink-0 w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm border border-gray-200">
            <span className="text-2xl">📚</span>
          </div>

          {/* Source information */}
          <div className="flex-1 min-w-0">
            <div className="font-medium text-gray-900 text-sm truncate" title={displayName}>
              {displayName}
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-600 mt-1">
              <span>{citation.page}ページ</span>
              <span className="text-gray-400">•</span>
              <span className={`font-medium ${colors.text}`}>
                信頼度: {confidencePercent}%
              </span>
            </div>
          </div>
        </div>

        {/* Confidence badge */}
        <div className={`flex-shrink-0 ml-2 px-2 py-1 rounded-full text-xs font-medium ${colors.badgeBg} ${colors.badgeText}`}>
          {citation.confidence > 0.8 ? '高' : citation.confidence > 0.6 ? '中' : '低'}
        </div>
      </div>

      {/* Metadata section (if available) */}
      {(citation.metadata?.section || citation.metadata?.topic) && (
        <div className="mb-3 flex flex-wrap gap-2">
          {citation.metadata.section && (
            <span className="text-xs bg-white px-2 py-1 rounded border border-gray-200 text-gray-700">
              📖 {citation.metadata.section}
            </span>
          )}
          {citation.metadata.topic && (
            <span className="text-xs bg-white px-2 py-1 rounded border border-gray-200 text-gray-700">
              🏷️ {citation.metadata.topic}
            </span>
          )}
        </div>
      )}

      {/* Text content */}
      <div className="text-sm text-gray-700 leading-relaxed">
        {expanded ? (citation.fullText || citation.excerpt) : citation.excerpt}
      </div>

      {/* Expand/Collapse button */}
      {hasFullText && (
        <button
          onClick={() => setExpanded(!expanded)}
          className={`
            mt-3 text-sm font-medium transition-colors
            flex items-center gap-1 hover:underline
            ${colors.text}
          `}
          aria-expanded={expanded}
          aria-label={expanded ? '閉じる' : 'もっと見る'}
        >
          <span>{expanded ? '閉じる' : 'もっと見る'}</span>
          <svg
            className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
      )}

      {/* Future: View Source button (opens PDF at specific page) */}
      {/* This will be implemented when PDF viewer is added */}
      {/*
      <button
        className={`
          mt-3 w-full sm:w-auto px-4 py-2 rounded-lg
          text-sm font-medium transition-colors
          bg-white border ${colors.border} ${colors.text}
          hover:bg-gray-50 hover:shadow
          flex items-center justify-center gap-2
        `}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
          />
        </svg>
        出典を見る
      </button>
      */}
    </div>
  );
}

/**
 * Multiple Guidebook Citations Container
 *
 * Displays multiple citations grouped together with aggregate confidence
 */

export interface GuidebookEvidenceRailProps {
  citations: GuidebookCitation[];
  title?: string;
  emptyMessage?: string;
  className?: string;
}

export function GuidebookEvidenceRail({
  citations,
  title,
  emptyMessage,
  className = '',
}: GuidebookEvidenceRailProps) {
  const t = useTranslations();

  const displayTitle = title || t('chat.evidence_title') || '根拠となる資料';
  const displayEmptyMessage = emptyMessage || t('chat.evidence_empty') || 'AIが情報源を示す際、ここに表示されます';

  // Calculate aggregate confidence
  const avgConfidence = citations.length > 0
    ? citations.reduce((sum, c) => sum + c.confidence, 0) / citations.length
    : 0;

  const hasHighAgreement = avgConfidence >= 0.8 && citations.length > 1;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg text-gray-900 flex items-center gap-2">
          <span className="text-xl">📚</span>
          <span>{displayTitle}</span>
        </h3>
        {citations.length > 0 && (
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
            {citations.length}件
          </span>
        )}
      </div>

      {/* Multiple source confirmation */}
      {hasHighAgreement && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2 animate-fadeIn">
          <span className="text-lg">✓</span>
          <span className="text-sm text-green-800 font-medium">
            {citations.length}つの情報源が一致しています
          </span>
        </div>
      )}

      {/* Citations list */}
      {citations.length === 0 ? (
        <div className="text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
          <div className="mb-2 text-2xl opacity-50">📖</div>
          <div>{displayEmptyMessage}</div>
        </div>
      ) : (
        <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto custom-scrollbar pr-2">
          {citations.map((citation, idx) => (
            <GuidebookEvidenceCard
              key={`citation-${idx}-${citation.source}-${citation.page}`}
              citation={citation}
              className="animate-fadeIn"
              style={{ animationDelay: `${idx * 50}ms` }}
            />
          ))}
        </div>
      )}

      {/* Trust note */}
      {citations.length > 0 && (
        <div className="text-xs text-gray-600 italic bg-blue-50 border border-blue-100 rounded-lg p-3">
          ℹ️ すべての推奨は信頼できる農業ガイドブックに基づいています
        </div>
      )}
    </div>
  );
}
