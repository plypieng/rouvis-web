'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Sparkles, TrendingUp, AlertTriangle, Info, ChevronRight } from 'lucide-react';

export interface Recommendation {
  id?: string;
  text: string;
  confidence: number; // 0-1
  evidence?: {
    sources: string[];
    count: number;
  };
  priority?: 'high' | 'medium' | 'low';
  category?: 'weather' | 'crop' | 'task' | 'general';
  actionable?: boolean;
}

interface AIRecommendationCardProps {
  recommendation: Recommendation;
  onViewDetails?: () => void;
  compact?: boolean;
}

/**
 * AI Recommendation display card
 *
 * Features:
 * - Show AI recommendation with confidence indicator
 * - Evidence badge with source count
 * - Trust indicator (high/medium/low)
 * - Crop-themed color palette
 * - Compact design optimized for overview cards
 */
export function AIRecommendationCard({
  recommendation,
  onViewDetails,
  compact = false,
}: AIRecommendationCardProps) {
  const t = useTranslations();
  const [isHovered, setIsHovered] = useState(false);

  // Determine trust level based on confidence
  const getTrustLevel = () => {
    if (recommendation.confidence >= 0.8) return 'high';
    if (recommendation.confidence >= 0.6) return 'medium';
    return 'low';
  };

  const trustLevel = getTrustLevel();

  // Color schemes based on trust level
  const trustColors = {
    high: {
      gradient: 'from-emerald-500 to-green-500',
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      text: 'text-emerald-700',
      badge: 'bg-emerald-100 text-emerald-700',
      icon: 'text-emerald-600',
      progress: 'bg-emerald-500',
      soft: 'from-emerald-50/80 to-white',
    },
    medium: {
      gradient: 'from-amber-500 to-yellow-500',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      text: 'text-amber-700',
      badge: 'bg-amber-100 text-amber-700',
      icon: 'text-amber-600',
      progress: 'bg-amber-500',
      soft: 'from-amber-50/80 to-white',
    },
    low: {
      gradient: 'from-sky-500 to-blue-500',
      bg: 'bg-sky-50',
      border: 'border-sky-200',
      text: 'text-sky-700',
      badge: 'bg-sky-100 text-sky-700',
      icon: 'text-sky-600',
      progress: 'bg-sky-500',
      soft: 'from-sky-50/80 to-white',
    },
  };

  const colors = trustColors[trustLevel];
  const confidencePercentage = Math.round(recommendation.confidence * 100);

  // Get icon based on trust level
  const getTrustIcon = () => {
    switch (trustLevel) {
      case 'high':
        return <TrendingUp className="w-4 h-4" aria-hidden="true" />;
      case 'medium':
        return <Info className="w-4 h-4" aria-hidden="true" />;
      case 'low':
        return <AlertTriangle className="w-4 h-4" aria-hidden="true" />;
    }
  };

  // Get label based on trust level
  const getTrustLabel = () => {
    switch (trustLevel) {
      case 'high':
        return t('chat.high_confidence');
      case 'medium':
        return t('chat.medium_confidence');
      case 'low':
        return t('chat.low_confidence');
    }
  };

  // Mappers for chips
  const categoryLabel =
    recommendation.category === 'weather'
      ? '天気'
      : recommendation.category === 'crop'
      ? '作物'
      : recommendation.category === 'task'
      ? 'タスク'
      : '一般';

  const priorityLabel =
    recommendation.priority === 'high'
      ? '高'
      : recommendation.priority === 'medium'
      ? '中'
      : recommendation.priority === 'low'
      ? '低'
      : undefined;

  return (
    <div
      className={`
        relative overflow-hidden rounded-xl border ${colors.border} bg-gradient-to-br ${colors.soft}
        ${compact ? 'p-4' : 'p-5'}
        transition-all duration-200 hover:shadow-md
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onViewDetails}
      role={onViewDetails ? 'button' : 'article'}
      tabIndex={onViewDetails ? 0 : undefined}
      onKeyDown={(e) => {
        if (onViewDetails && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onViewDetails();
        }
      }}
    >
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute -top-10 -right-10 h-24 w-24 rounded-full bg-gradient-to-br from-white/60 to-transparent blur-2xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-12 h-40 w-40 rounded-full bg-gradient-to-tr from-white/40 to-transparent blur-2xl" />

      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg bg-gradient-to-br ${colors.gradient} shadow-sm`}>
            <Sparkles className="w-4 h-4 text-white" aria-hidden="true" />
          </div>
          <div className="flex flex-col">
            <span className={`text-xs font-semibold tracking-wide ${colors.text}`}>AI提案</span>
            {/* Confidence meter */}
            <div className="mt-1 flex items-center gap-2">
              <div className="h-1.5 w-24 rounded-full bg-white/70">
                <div
                  className={`h-1.5 rounded-full ${colors.progress}`}
                  style={{ width: `${confidencePercentage}%` }}
                />
              </div>
              <span className={`text-[10px] font-medium ${colors.text}`}>{confidencePercentage}%</span>
            </div>
          </div>
        </div>

        {/* Trust indicator pill */}
        <div
          className={`flex items-center gap-1 px-2 py-1 rounded-full ${colors.badge} text-xs font-medium border ${colors.border}`}
          title={`信頼度: ${confidencePercentage}%`}
        >
          {getTrustIcon()}
          <span>{getTrustLabel()}</span>
        </div>
      </div>

      {/* Recommendation text */}
      <p className={`mt-3 text-gray-900 leading-relaxed ${compact ? 'text-sm' : 'text-base'}`}>
        {recommendation.text}
      </p>

      {/* Chips row */}
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        {recommendation.category && (
          <span className={`px-2 py-1 rounded-full border ${colors.border} bg-white/70 text-gray-700`}>
            {categoryLabel}
          </span>
        )}
        {priorityLabel && (
          <span className={`px-2 py-1 rounded-full ${colors.badge} border ${colors.border}`}>
            優先度: {priorityLabel}
          </span>
        )}
        {recommendation.evidence && recommendation.evidence.count > 0 && (
          <span className="px-2 py-1 rounded-full bg-gray-100 border border-gray-200 text-gray-700">
            根拠 {recommendation.evidence.count}
          </span>
        )}
      </div>

      {/* CTA actions */}
      {onViewDetails && (
        <div className="mt-3 flex items-center gap-2">
          {recommendation.actionable && (
            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-600 text-white text-xs font-medium shadow hover:bg-emerald-700 transition-colors"
            >
              今すぐ適用
            </button>
          )}
          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-gray-200 bg-white text-gray-700 text-xs font-medium hover:border-emerald-300 hover:text-emerald-700 transition-colors"
          >
            詳細を見る
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Hover glow */}
      <div
        className={`absolute inset-0 rounded-xl ring-1 ring-inset ring-transparent transition-opacity duration-200 ${
          isHovered ? 'opacity-100 shadow-[0_10px_30px_-10px_rgba(16,185,129,0.35)]' : 'opacity-0'
        }`}
      />
    </div>
  );
}
