'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { WeatherWarning } from '@/hooks/useWeatherForecast';

interface WeatherWarningBannerProps {
  warnings: WeatherWarning[];
  maxVisible?: number; // Max warnings to show initially
}

/**
 * WeatherWarningBanner - Display active JMA weather warnings
 *
 * Shows weather warnings with:
 * - Severity-based colors (Advisory/Warning/Emergency)
 * - Warning type icons (rain/wind/heat/frost)
 * - Expandable details
 * - Affected areas
 *
 * Severity levels:
 * - Advisory (注意報): Yellow/amber
 * - Warning (警報): Orange
 * - Emergency (特別警報): Red
 *
 * Design:
 * - Stacked cards with clear severity indicators
 * - Material Symbols icons for warning types
 * - Click to expand/collapse details
 */
export function WeatherWarningBanner({
  warnings,
  maxVisible = 3,
}: WeatherWarningBannerProps) {
  const t = useTranslations();
  const [expandedWarnings, setExpandedWarnings] = useState<Set<number>>(new Set());

  // Toggle warning expansion
  const toggleWarning = (index: number) => {
    setExpandedWarnings(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  // Get severity badge class
  const getSeverityClass = (severity: string) => {
    if (severity === 'emergency') {
      return 'bg-rose-600 text-white border-rose-700';
    }
    if (severity === 'warning') {
      return 'bg-amber-500 text-white border-amber-600';
    }
    return 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-200/20 dark:text-amber-300 dark:border-amber-700';
  };

  // Get severity label
  const getSeverityLabel = (severity: string) => {
    const labels: Record<string, string> = {
      emergency: t('weather.emergency'),
      warning: t('weather.warning'),
      advisory: t('weather.advisory'),
    };
    return labels[severity] || severity;
  };

  // Get warning icon based on type
  const getWarningIcon = (type: string) => {
    const lowerType = type.toLowerCase();
    if (lowerType.includes('rain') || lowerType.includes('雨')) return 'rainy';
    if (lowerType.includes('wind') || lowerType.includes('風')) return 'air';
    if (lowerType.includes('heat') || lowerType.includes('高温')) return 'wb_sunny';
    if (lowerType.includes('frost') || lowerType.includes('霜')) return 'ac_unit';
    if (lowerType.includes('snow') || lowerType.includes('雪')) return 'weather_snowy';
    if (lowerType.includes('thunder') || lowerType.includes('雷')) return 'bolt';
    return 'warning';
  };

  // Empty state
  if (warnings.length === 0) {
    return null; // Don't show anything if no warnings
  }

  // Sort by severity (emergency > warning > advisory)
  const sortedWarnings = [...warnings].sort((a, b) => {
    const severityOrder = { emergency: 0, warning: 1, advisory: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });

  const visibleWarnings = sortedWarnings.slice(0, maxVisible);

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-amber-600 dark:text-amber-400">
          warning
        </span>
        <h3 className="text-sm font-bold text-crop-900 dark:text-white">
          {t('weather.warning_banner')}
        </h3>
      </div>

      {/* Warnings List */}
      <div className="space-y-2">
        {visibleWarnings.map((warning, index) => {
          const isExpanded = expandedWarnings.has(index);

          return (
            <div
              key={index}
              className={`rounded-lg border-2 ${getSeverityClass(warning.severity)} overflow-hidden transition-all`}
            >
              {/* Warning Header (always visible) */}
              <button
                onClick={() => toggleWarning(index)}
                className="w-full px-4 py-3 text-left flex items-start gap-3 hover:opacity-90 transition-opacity"
              >
                {/* Icon */}
                <span className="material-symbols-outlined !text-xl flex-shrink-0 mt-0.5">
                  {getWarningIcon(warning.type)}
                </span>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {/* Severity badge + Title */}
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider">
                      {getSeverityLabel(warning.severity)}
                    </span>
                    <span className="text-xs opacity-60">
                      {new Date(warning.issuedAt).toLocaleTimeString('ja-JP', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-sm font-bold">
                    {warning.title}
                  </p>

                  {/* Areas (if not expanded) */}
                  {!isExpanded && warning.areas.length > 0 && (
                    <p className="mt-1 text-xs opacity-80 truncate">
                      {warning.areas.join('、')}
                    </p>
                  )}
                </div>

                {/* Expand icon */}
                <span
                  className={`material-symbols-outlined !text-xl flex-shrink-0 transition-transform ${
                    isExpanded ? 'rotate-180' : ''
                  }`}
                >
                  expand_more
                </span>
              </button>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="border-t border-current/20 px-4 py-3 bg-black/5 dark:bg-white/5">
                  {/* Description */}
                  <p className="text-sm mb-3 whitespace-pre-line">
                    {warning.description}
                  </p>

                  {/* Affected Areas */}
                  {warning.areas.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold mb-1 opacity-80">
                        {t('weather.affected_areas')}:
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {warning.areas.map((area, idx) => (
                          <span
                            key={idx}
                            className="text-xs px-2 py-0.5 rounded bg-black/10 dark:bg-white/10"
                          >
                            {area}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Issued time */}
                  <p className="mt-2 text-[10px] opacity-60">
                    {t('weather.issued_at')}: {new Date(warning.issuedAt).toLocaleString('ja-JP')}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Show More */}
      {sortedWarnings.length > maxVisible && (
        <button
          onClick={() => {
            // TODO: Open modal or expand all warnings
            console.log('Show all warnings');
          }}
          className="w-full py-2 text-center text-xs font-medium text-amber-700 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300 transition-colors"
        >
          {t('weather.show_all_warnings')} ({sortedWarnings.length - maxVisible} {t('weather.more')})
        </button>
      )}
    </div>
  );
}
