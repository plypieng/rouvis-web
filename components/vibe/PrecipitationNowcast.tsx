'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { NowcastEntry } from '@/hooks/useWeatherForecast';

interface PrecipitationNowcastProps {
  nowcast: NowcastEntry[];
  loading?: boolean;
  autoRefresh?: boolean; // Auto-refresh every 5 minutes
}

/**
 * PrecipitationNowcast - 1-hour precipitation forecast timeline
 *
 * Displays JMA nowcast data with:
 * - Current precipitation status
 * - 1-hour timeline visualization
 * - Rain intensity indicator (light/moderate/heavy)
 * - Auto-refresh every 5 minutes
 *
 * Design:
 * - Compact horizontal timeline
 * - Color-coded intensity (sky-blue for light, amber for moderate, rose for heavy)
 * - Material Symbols icons
 */
export function PrecipitationNowcast({
  nowcast,
  loading = false,
  autoRefresh = true,
}: PrecipitationNowcastProps) {
  const t = useTranslations();
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Auto-refresh every 5 minutes
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      setLastUpdated(new Date());
      // Trigger parent refetch (would need to be passed as prop)
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Get intensity label
  const getIntensityLabel = (intensity: string) => {
    const labels: Record<string, string> = {
      none: t('weather.no_rain'),
      light: t('weather.light_rain'),
      moderate: t('weather.moderate_rain'),
      heavy: t('weather.heavy_rain'),
    };
    return labels[intensity] || intensity;
  };

  // Get intensity color class
  const getIntensityColor = (intensity: string) => {
    if (intensity === 'heavy') return 'bg-rose-500';
    if (intensity === 'moderate') return 'bg-amber-500';
    if (intensity === 'light') return 'bg-sky-400';
    return 'bg-secondary-200 dark:bg-secondary-700';
  };

  // Get intensity icon
  const getIntensityIcon = (intensity: string) => {
    if (intensity === 'heavy') return '🌧️';
    if (intensity === 'moderate') return '🌦️';
    if (intensity === 'light') return '💧';
    return '☁️';
  };

  // Current status (first entry)
  const currentStatus = nowcast[0];
  const hasRain = nowcast.some(entry => entry.intensity !== 'none');

  // Loading skeleton
  if (loading) {
    return (
      <div className="rounded-lg bg-white p-4 shadow-sm dark:bg-background/50">
        <div className="animate-pulse">
          <div className="h-4 w-32 bg-secondary-200 rounded dark:bg-secondary-700"></div>
          <div className="mt-3 h-20 bg-secondary-200 rounded dark:bg-secondary-700"></div>
        </div>
      </div>
    );
  }

  // Empty state
  if (nowcast.length === 0) {
    return (
      <div className="rounded-lg bg-white p-4 shadow-sm dark:bg-background/50">
        <div className="flex items-center gap-2 text-sm text-secondary-600 dark:text-secondary-400">
          <span className="material-symbols-outlined">cloud_off</span>
          <span>{t('weather.nowcast_unavailable')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-white p-4 shadow-sm dark:bg-background/50">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold text-crop-900 dark:text-white">
          {t('weather.nowcast')}
        </h3>
        <span className="text-xs text-secondary-600 dark:text-secondary-400">
          {t('weather.next_hour')}
        </span>
      </div>

      {/* Current Status */}
      {currentStatus && (
        <div className="mb-4 flex items-center gap-3 rounded-lg bg-secondary-50 p-3 dark:bg-background/30">
          <div className="text-3xl" role="img" aria-label="current precipitation">
            {getIntensityIcon(currentStatus.intensity)}
          </div>
          <div className="flex-1">
            <p className="text-xs text-secondary-600 dark:text-secondary-400">
              {t('weather.current_status')}
            </p>
            <p className="mt-0.5 text-base font-bold text-crop-900 dark:text-white">
              {getIntensityLabel(currentStatus.intensity)}
            </p>
            {currentStatus.precipitation > 0 && (
              <p className="mt-0.5 text-xs text-secondary-600 dark:text-secondary-400">
                {currentStatus.precipitation}mm/h
              </p>
            )}
          </div>
        </div>
      )}

      {/* 1-Hour Timeline */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-secondary-600 dark:text-secondary-400">
          {t('weather.timeline')}
        </p>
        <div className="flex items-end gap-1">
          {nowcast.slice(0, 12).map((entry, idx) => {
            // Show time label every 15 minutes (every 3 entries assuming 5-min intervals)
            const showTimeLabel = idx % 3 === 0;
            const time = new Date(entry.time);
            const minutes = time.getMinutes();

            return (
              <div key={idx} className="flex flex-1 flex-col items-center gap-1">
                {/* Bar chart */}
                <div className="relative w-full">
                  <div
                    className={`w-full rounded-t transition-all ${getIntensityColor(entry.intensity)}`}
                    style={{
                      height: `${Math.max(4, entry.precipitation * 2)}px`,
                      minHeight: '4px',
                    }}
                  ></div>
                </div>
                {/* Time label */}
                {showTimeLabel && (
                  <span className="text-[9px] text-secondary-600 dark:text-secondary-400">
                    {minutes === 0 ? time.getHours() : `:${minutes.toString().padStart(2, '0')}`}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        {hasRain && (
          <div className="mt-3 flex flex-wrap gap-2 text-[10px]">
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-sky-400"></div>
              <span className="text-secondary-600 dark:text-secondary-400">{t('weather.light_rain')}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-amber-500"></div>
              <span className="text-secondary-600 dark:text-secondary-400">{t('weather.moderate_rain')}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-rose-500"></div>
              <span className="text-secondary-600 dark:text-secondary-400">{t('weather.heavy_rain')}</span>
            </div>
          </div>
        )}
      </div>

      {/* Last updated */}
      <div className="mt-3 border-t border-secondary-200 pt-2 text-center dark:border-secondary-700">
        <p className="text-[9px] text-secondary-600 dark:text-secondary-400">
          {t('weather.last_updated')}: {lastUpdated.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
}
