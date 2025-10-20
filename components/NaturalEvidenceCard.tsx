'use client';

import { useState } from 'react';
import { Citation } from '@/types/chat';
import { ChevronDown, ExternalLink } from 'lucide-react';

interface NaturalEvidenceCardProps {
  /**
   * Natural Evidence Card - Shows sources without technical jargon
   *
   * Principles (FARMER_UX_VISION.md - Principle 5: Trust Through Evidence):
   * ❌ Bad: "Confidence: 0.82, Source: JMA_API, Model: GPT-4, Agent: Weather"
   * ✅ Good: Natural text with inline citations
   *
   * Example:
   * "今日は水やりに最適です。
   *
   * 理由：
   * ・気象庁（JMA）によると、今後3日間雨の予報なし
   * ・『新潟県稲作指導』: この時期は2日おきの水やりが標準
   * ・あなたの記録: 前回の水やりから3日経過"
   */
  citations: Citation[];
  showMultipleSourceConfirmation?: boolean;
}

export function NaturalEvidenceCard({
  citations,
  showMultipleSourceConfirmation = true,
}: NaturalEvidenceCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (citations.length === 0) {
    return null;
  }

  // Calculate agreement level
  const avgConfidence =
    citations.reduce((sum, c) => sum + c.confidence, 0) / citations.length;
  const hasHighAgreement = avgConfidence >= 0.8;
  const hasMediumAgreement = avgConfidence >= 0.5 && avgConfidence < 0.8;

  // Group by source type for display
  const jmaSources = citations.filter((c) => c.type === 'jma');
  const guidebookSources = citations.filter((c) => c.type === 'guidebook');
  const fieldSources = citations.filter((c) => c.type === 'field_data');
  const otherSources = citations.filter(
    (c) => !['jma', 'guidebook', 'field_data'].includes(c.type || '')
  );

  const getSourceBadge = (type: string | undefined) => {
    switch (type) {
      case 'jma':
        return { label: 'JMA公式', emoji: '🌤️', bg: 'bg-blue-100 text-blue-800' };
      case 'guidebook':
        return {
          label: '新潟県ガイド',
          emoji: '📚',
          bg: 'bg-green-100 text-green-800',
        };
      case 'field_data':
        return { label: '実績', emoji: '🌾', bg: 'bg-purple-100 text-purple-800' };
      default:
        return { label: '情報源', emoji: 'ℹ️', bg: 'bg-gray-100 text-gray-800' };
    }
  };

  const renderSourceGroup = (
    sources: Citation[],
    title: string,
    badge: ReturnType<typeof getSourceBadge>
  ) => {
    if (sources.length === 0) return null;

    return (
      <div className="mb-3">
        <div className="flex items-center gap-2 mb-2">
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${badge.bg}`}>
            {badge.emoji} {badge.label}
          </span>
        </div>
        <ul className="space-y-2">
          {sources.map((citation, idx) => (
            <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
              <span className="text-gray-400 mt-0.5">・</span>
              <div className="flex-1">
                <span className="font-medium">{citation.source}</span>
                {citation.page && (
                  <span className="text-xs text-gray-500 ml-1">(p.{citation.page})</span>
                )}
                {citation.text && (
                  <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                    {citation.text}
                  </p>
                )}
                {citation.url && (
                  <a
                    href={citation.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 mt-1"
                  >
                    詳細を見る
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-4 animate-fadeIn">
      {/* Multiple Source Confirmation - Natural Language */}
      {showMultipleSourceConfirmation && citations.length > 1 && (
        <div className="mb-3 flex items-center gap-2">
          {hasHighAgreement && (
            <div className="text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg border border-green-200 flex items-center gap-2">
              <span className="text-lg">✓</span>
              <span className="font-medium">
                {citations.length}つの情報源が一致しています
              </span>
            </div>
          )}
          {hasMediumAgreement && (
            <div className="text-sm text-yellow-700 bg-yellow-50 px-3 py-2 rounded-lg border border-yellow-200 flex items-center gap-2">
              <span className="text-lg">⚠</span>
              <span className="font-medium">複数の情報源から確認中</span>
            </div>
          )}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <svg
            className="w-4 h-4 text-blue-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          根拠
        </h4>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs text-blue-700 hover:text-blue-900 font-medium flex items-center gap-1 px-2 py-1 rounded hover:bg-blue-100 transition-colors"
        >
          <span>{isExpanded ? '閉じる' : '詳細を見る'}</span>
          <ChevronDown
            className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {/* Compact View - Always Visible */}
      {!isExpanded && (
        <div className="text-sm text-gray-700 space-y-1">
          {jmaSources.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-medium">
                🌤️ JMA公式
              </span>
              <span className="text-xs text-gray-600">
                {jmaSources.length}件の気象データ
              </span>
            </div>
          )}
          {guidebookSources.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-medium">
                📚 新潟県ガイド
              </span>
              <span className="text-xs text-gray-600">
                {guidebookSources.length}件のガイドブック
              </span>
            </div>
          )}
          {fieldSources.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full font-medium">
                🌾 実績
              </span>
              <span className="text-xs text-gray-600">
                あなたの過去{fieldSources.length}件の記録
              </span>
            </div>
          )}
        </div>
      )}

      {/* Expanded View - Full Details */}
      {isExpanded && (
        <div className="mt-3 space-y-3 max-h-96 overflow-y-auto pr-2">
          {renderSourceGroup(
            jmaSources,
            '気象庁（JMA）',
            getSourceBadge('jma')
          )}
          {renderSourceGroup(
            guidebookSources,
            '新潟県ガイドブック',
            getSourceBadge('guidebook')
          )}
          {renderSourceGroup(
            fieldSources,
            'あなたの圃場データ',
            getSourceBadge('field_data')
          )}
          {renderSourceGroup(otherSources, 'その他の情報源', getSourceBadge('general'))}
        </div>
      )}

      {/* Learn More Note */}
      <div className="mt-3 pt-3 border-t border-blue-200">
        <p className="text-xs text-gray-600 italic">
          ℹ️ すべての推奨は複数の信頼できる情報源に基づいています
        </p>
      </div>
    </div>
  );
}
