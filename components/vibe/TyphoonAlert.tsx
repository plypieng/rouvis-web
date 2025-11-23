'use client';

import { useTranslations } from 'next-intl';
import { TyphoonInfo } from '@/hooks/useWeatherForecast';

interface TyphoonAlertProps {
  typhoons: TyphoonInfo[];
}

/**
 * TyphoonAlert - Display active typhoon information
 *
 * Shows typhoon alerts with:
 * - Typhoon name and ID
 * - Current position and intensity
 * - Approaching status
 * - Affected areas list
 * - Forecast track (if available)
 *
 * Design:
 * - High-visibility rose/red color scheme
 * - Material Symbols icons
 * - Compact card format with expandable details
 */
export function TyphoonAlert({ typhoons }: TyphoonAlertProps) {
  const t = useTranslations();

  // Empty state - no typhoons
  if (typhoons.length === 0) {
    return null; // Don't show component if no active typhoons
  }

  // Filter approaching typhoons first
  const approachingTyphoons = typhoons.filter(t => t.isApproaching);
  const displayTyphoons = approachingTyphoons.length > 0 ? approachingTyphoons : typhoons;

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-rose-600 dark:text-rose-400">
          cyclone
        </span>
        <h3 className="text-sm font-bold text-crop-900 dark:text-white">
          {t('weather.typhoon_alert')}
        </h3>
      </div>

      {/* Typhoon Cards */}
      <div className="space-y-2">
        {displayTyphoons.map((typhoon, index) => (
          <div
            key={typhoon.id}
            className="rounded-lg border-2 border-rose-600 bg-rose-50 dark:bg-rose-900/20 overflow-hidden"
          >
            {/* Typhoon Header */}
            <div className="px-4 py-3 bg-rose-600 text-white">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined !text-2xl">
                  cyclone
                </span>
                <div className="flex-1">
                  <p className="text-sm font-bold">
                    {typhoon.name || t('weather.unnamed_typhoon')}
                  </p>
                  <p className="text-xs opacity-90">
                    {t('weather.typhoon_id')}: {typhoon.id}
                  </p>
                </div>
                {typhoon.isApproaching && (
                  <span className="px-2 py-1 bg-rose-700 rounded text-[10px] font-bold">
                    {t('weather.typhoon_approaching')}
                  </span>
                )}
              </div>
            </div>

            {/* Typhoon Details */}
            <div className="px-4 py-3 space-y-3">
              {/* Intensity */}
              <div className="flex items-start gap-2">
                <span className="material-symbols-outlined text-rose-600 dark:text-rose-400">
                  speed
                </span>
                <div className="flex-1">
                  <p className="text-xs text-secondary-600 dark:text-secondary-400">
                    {t('weather.intensity')}
                  </p>
                  <p className="text-sm font-semibold text-crop-900 dark:text-white">
                    {typhoon.intensity}
                  </p>
                </div>
              </div>

              {/* Position */}
              <div className="flex items-start gap-2">
                <span className="material-symbols-outlined text-rose-600 dark:text-rose-400">
                  location_on
                </span>
                <div className="flex-1">
                  <p className="text-xs text-secondary-600 dark:text-secondary-400">
                    {t('weather.current_position')}
                  </p>
                  <p className="text-sm font-semibold text-crop-900 dark:text-white">
                    {typhoon.position.lat.toFixed(1)}°N, {typhoon.position.lon.toFixed(1)}°E
                  </p>
                </div>
              </div>

              {/* Affected Areas */}
              {typhoon.affectedAreas.length > 0 && (
                <div className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-rose-600 dark:text-rose-400">
                    notifications_active
                  </span>
                  <div className="flex-1">
                    <p className="text-xs text-secondary-600 dark:text-secondary-400 mb-1">
                      {t('weather.affected_areas')}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {typhoon.affectedAreas.map((area, idx) => (
                        <span
                          key={idx}
                          className="text-xs px-2 py-0.5 rounded bg-rose-200 text-rose-900 dark:bg-rose-800/50 dark:text-rose-200"
                        >
                          {area}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Warning Message */}
              {typhoon.isApproaching && (
                <div className="mt-2 pt-2 border-t border-rose-300 dark:border-rose-700">
                  <div className="flex items-start gap-2 text-xs text-rose-800 dark:text-rose-300">
                    <span className="material-symbols-outlined !text-base">
                      info
                    </span>
                    <p>
                      {t('weather.typhoon_warning_message')}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="px-4 py-2 bg-rose-100 dark:bg-rose-900/30 border-t border-rose-300 dark:border-rose-700">
              <button
                onClick={() => {
                  // TODO: Open detailed typhoon track view
                  console.log('View typhoon details:', typhoon.id);
                }}
                className="text-xs font-medium text-rose-700 hover:text-rose-800 dark:text-rose-400 dark:hover:text-rose-300 transition-colors"
              >
                {t('weather.view_forecast_track')} →
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Safety Reminder */}
      <div className="mt-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 p-3">
        <div className="flex items-start gap-2 text-xs text-amber-900 dark:text-amber-300">
          <span className="material-symbols-outlined !text-base flex-shrink-0">
            shield
          </span>
          <p>
            {t('weather.typhoon_safety_reminder')}
          </p>
        </div>
      </div>
    </div>
  );
}
