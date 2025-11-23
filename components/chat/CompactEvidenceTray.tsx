'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { GuidebookEvidenceCard, GuidebookCitation } from '../GuidebookEvidenceCard';
import { ConfidenceIndicator } from '../ConfidenceIndicator';

/**
 * Compact Evidence Tray
 *
 * Collapsible evidence section optimized for narrow left rail (360-400px).
 * Displays guidebook citations in a space-efficient format with:
 * - Collapsible toggle button
 * - Aggregate confidence indicator
 * - Scrollable citation list
 * - Natural, farmer-friendly language
 *
 * Design principles:
 * - Vertical layout for narrow width
 * - Touch-friendly interactions
 * - Minimal chrome, maximum content
 * - Graceful collapse/expand animations
 */

export interface CompactEvidenceTrayProps {
  citations: GuidebookCitation[];
  defaultOpen?: boolean;
  className?: string;
}

export function CompactEvidenceTray({
  citations,
  defaultOpen = false,
  className = '',
}: CompactEvidenceTrayProps) {
  const t = useTranslations();
  const [isOpen, setIsOpen] = useState(defaultOpen);

  // Calculate aggregate confidence
  const avgConfidence = citations.length > 0
    ? citations.reduce((sum, c) => sum + c.confidence, 0) / citations.length
    : 0;

  const confidencePercent = Math.round(avgConfidence * 100);

  const hasHighAgreement = avgConfidence >= 0.8 && citations.length > 1;

  const displayTitle = t('chat.evidence_title') || '根拠資料';
  const displayEmptyMessage = t('chat.evidence_empty') || '情報源がここに表示されます';

  if (citations.length === 0) {
    return null;
  }

  return (
    <div className={`border-t border-gray-200 bg-gray-50 ${className}`}>
      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-100 transition-colors"
        aria-expanded={isOpen}
        aria-label={isOpen ? '根拠資料を閉じる' : '根拠資料を開く'}
      >
        <div className="flex items-center gap-2">
          <span className="text-base">📚</span>
          <span className="font-medium text-sm text-gray-900">{displayTitle}</span>
          <span className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded-full border border-gray-200">
            {citations.length}件
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Confidence indicator */}
          {avgConfidence > 0 && (
            <span className={`text-xs font-medium ${
              avgConfidence > 0.8
                ? 'text-green-700'
                : avgConfidence > 0.6
                ? 'text-yellow-700'
                : 'text-gray-700'
            }`}>
              {confidencePercent}%
            </span>
          )}

          {/* Chevron icon */}
          <svg
            className={`w-4 h-4 text-gray-600 transition-transform ${isOpen ? 'rotate-180' : ''}`}
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
        </div>
      </button>

      {/* Collapsible content */}
      {isOpen && (
        <div className="px-4 pb-4 space-y-3 animate-fadeIn">
          {/* Full confidence indicator */}
          {avgConfidence > 0 && (
            <div className="mb-2">
              <ConfidenceIndicator confidence={avgConfidence} />
            </div>
          )}

          {/* Multiple source confirmation */}
          {hasHighAgreement && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-2.5 flex items-center gap-2 text-xs">
              <span className="text-base">✓</span>
              <span className="text-green-800 font-medium">
                {citations.length}つの情報源が一致
              </span>
            </div>
          )}

          {/* Citations list - compact version */}
          <div className="space-y-2 max-h-[40vh] overflow-y-auto custom-scrollbar pr-1">
            {citations.map((citation, idx) => (
              <GuidebookEvidenceCard
                key={`compact-citation-${idx}-${citation.source}-${citation.page}`}
                citation={citation}
                className="text-xs"
                style={{ animationDelay: `${idx * 30}ms` }}
              />
            ))}
          </div>

          {/* Trust note - compact version */}
          <div className="text-xs text-gray-600 italic bg-blue-50 border border-blue-100 rounded-lg p-2">
            ℹ️ 農業ガイドブックに基づく推奨
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Compact Evidence Summary Badge
 *
 * Minimal inline badge showing evidence count and confidence.
 * Used when evidence tray is collapsed or for mobile views.
 */

export interface CompactEvidenceBadgeProps {
  citationCount: number;
  avgConfidence: number;
  className?: string;
  onClick?: () => void;
}

export function CompactEvidenceBadge({
  citationCount,
  avgConfidence,
  className = '',
  onClick,
}: CompactEvidenceBadgeProps) {
  if (citationCount === 0) {
    return null;
  }

  const confidencePercent = Math.round(avgConfidence * 100);
  const confidenceColor =
    avgConfidence > 0.8
      ? 'bg-green-100 text-green-800 border-green-200'
      : avgConfidence > 0.6
      ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
      : 'bg-gray-100 text-gray-800 border-gray-200';

  return (
    <button
      onClick={onClick}
      className={`
        inline-flex items-center gap-1.5 px-2 py-1 rounded-full border text-xs font-medium
        transition-all hover:shadow-sm
        ${confidenceColor}
        ${className}
      `}
      aria-label={`${citationCount}件の根拠資料（信頼度${confidencePercent}%）`}
    >
      <span className="text-sm">📚</span>
      <span>{citationCount}</span>
      <span className="text-gray-400">•</span>
      <span>{confidencePercent}%</span>
    </button>
  );
}
