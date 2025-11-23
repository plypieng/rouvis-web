'use client';

import { useTranslations } from 'next-intl';
import { WeatherWarning } from '@/hooks/useWeatherForecast';

interface NextHourForecast {
  time: string;
  temperature: number;
  precipitation: number;
  condition: string;
}

interface WeatherSummaryBlockProps {
  temperature: number;
  humidity: number;
  windSpeed: number;
  windDirection?: string;
  condition: string;
  icon: string;
  precipitation?: number;
  highTemp?: number;
  lowTemp?: number;
  nextHours?: NextHourForecast[];
  warnings?: WeatherWarning[];
}

/**
 * WeatherSummaryBlock - Compact weather summary for Today's Overview
 *
 * Displays current weather conditions in a compact card format:
 * - Weather icon (Material Symbols or emoji)
 * - Current temperature with high/low
 * - Humidity percentage
 * - Wind speed and direction
 * - Rain probability with warning text
 *
 * Design: bg-secondary-50, text-crop-700, compact layout
 */
export function WeatherSummaryBlock({
  temperature,
  humidity,
  windSpeed,
  windDirection,
  condition,
  icon,
  precipitation = 0,
  highTemp,
  lowTemp,
  nextHours = [],
  warnings = [],
}: WeatherSummaryBlockProps) {
  const t = useTranslations();

  // Map weather icons from API to emoji or Material Symbols
  const getWeatherIcon = (iconCode: string): string => {
    const iconMap: Record<string, string> = {
      '01d': '☀️', // clear sky day
      '01n': '🌙', // clear sky night
      '02d': '⛅', // few clouds day
      '02n': '☁️', // few clouds night
      '03d': '⛅', // scattered clouds
      '03n': '☁️',
      '04d': '☁️', // broken clouds
      '04n': '☁️',
      '09d': '🌧️', // shower rain
      '09n': '🌧️',
      '10d': '🌦️', // rain day
      '10n': '🌧️', // rain night
      '11d': '⛈️', // thunderstorm
      '11n': '⛈️',
      '13d': '❄️', // snow
      '13n': '❄️',
      '50d': '🌫️', // mist
      '50n': '🌫️'
    };

    return iconMap[iconCode] || '☀️';
  };

  // Localize condition string
  const localizeCondition = (cond: string): string => {
    const c = (cond || '').toLowerCase();
    if (c.includes('partly') && c.includes('cloud')) return t('weather.partly_cloudy');
    if (c.includes('sunny')) return t('weather.sunny');
    if (c.includes('heavy') && c.includes('rain')) return t('weather.heavy_rain');
    if (c.includes('rain')) return t('weather.rain');
    if (c.includes('cloud')) return t('weather.cloudy');
    return cond; // already localized (e.g., JMA: くもり/晴れ/雨)
  };

  // Determine rain warning color
  const getRainWarningClass = () => {
    if (precipitation >= 70) return 'text-rose-700 bg-rose-100/80 dark:bg-rose-200/20';
    if (precipitation >= 40) return 'text-amber-700 bg-amber-100/80 dark:bg-amber-200/20';
    return 'text-sky-700 bg-sky-100/80 dark:bg-sky-200/20';
  };

  // Get active warnings (only show highest severity)
  const activeWarnings = warnings.filter(w =>
    w.severity === 'emergency' || w.severity === 'warning' || w.severity === 'advisory'
  ).slice(0, 2); // Limit to 2 warnings

  // Get warning badge color
  const getWarningBadgeClass = (severity: string) => {
    if (severity === 'emergency') return 'bg-rose-600 text-white';
    if (severity === 'warning') return 'bg-amber-500 text-white';
    return 'bg-amber-100 text-amber-800 dark:bg-amber-200/20 dark:text-amber-400';
  };

  // Show next 3 hours from detailed forecast
  const upcomingHours = nextHours.slice(0, 3);

  return (
    <div className="rounded-lg bg-white p-4 shadow-sm dark:bg-background/50">
      {/* Header with weather icon and condition */}
      <div className="mb-3 flex items-center gap-3">
        <div className="text-4xl" role="img" aria-label={condition}>
          {getWeatherIcon(icon)}
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-medium text-secondary-600 dark:text-secondary-400">
            {t('vibe.weather_summary')}
          </h3>
          <p className="text-base font-bold text-crop-900 dark:text-white">
            {localizeCondition(condition)}
          </p>
        </div>
      </div>

      {/* Temperature */}
      <div className="mb-3 flex items-baseline gap-2">
        <span className="text-3xl font-bold text-crop-900 dark:text-white">
          {temperature}°
        </span>
        {(highTemp !== undefined || lowTemp !== undefined) && (
          <span className="text-sm text-secondary-600 dark:text-secondary-400">
            {highTemp !== undefined && `${highTemp}°`}
            {highTemp !== undefined && lowTemp !== undefined && ' / '}
            {lowTemp !== undefined && `${lowTemp}°`}
          </span>
        )}
      </div>

      {/* Weather details grid */}
      <div className="grid grid-cols-2 gap-3 border-t border-secondary-200 pt-3 dark:border-secondary-700">
        {/* Humidity */}
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-base text-secondary-600 dark:text-secondary-400">
            water_drop
          </span>
          <div>
            <p className="text-xs text-secondary-600 dark:text-secondary-400">湿度</p>
            <p className="text-sm font-semibold text-crop-900 dark:text-white">
              {humidity}%
            </p>
          </div>
        </div>

        {/* Wind */}
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-base text-secondary-600 dark:text-secondary-400">
            air
          </span>
          <div>
            <p className="text-xs text-secondary-600 dark:text-secondary-400">風速</p>
            <p className="text-sm font-semibold text-crop-900 dark:text-white">
              {windSpeed}m/s
              {windDirection && (
                <span className="ml-1 text-xs text-secondary-600 dark:text-secondary-400">
                  {windDirection}
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Rain probability */}
      {precipitation > 0 && (
        <div className={`mt-3 flex items-center gap-2 rounded px-2 py-1.5 text-xs font-medium ${getRainWarningClass()}`}>
          <span className="material-symbols-outlined !text-base">
            {precipitation >= 70 ? 'warning' : 'umbrella'}
          </span>
          <span>
            {t('dashboard.rain_chance', { percentage: precipitation })}
          </span>
        </div>
      )}

      {/* Active Weather Warnings */}
      {activeWarnings.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {activeWarnings.map((warning, idx) => (
            <div
              key={idx}
              className={`flex items-center gap-2 rounded px-2 py-1.5 text-xs font-medium ${getWarningBadgeClass(warning.severity)}`}
            >
              <span className="material-symbols-outlined !text-base">
                {warning.severity === 'emergency' ? 'error' : 'warning'}
              </span>
              <span className="flex-1">{warning.title}</span>
            </div>
          ))}
        </div>
      )}

      {/* Next 3 Hours Preview */}
      {upcomingHours.length > 0 && (
        <div className="mt-3 border-t border-secondary-200 pt-3 dark:border-secondary-700">
          <p className="mb-2 text-xs font-medium text-secondary-600 dark:text-secondary-400">
            {t('weather.next_3_hours')}
          </p>
          <div className="flex gap-3">
            {upcomingHours.map((hour, idx) => (
              <div key={idx} className="flex-1 text-center">
                <p className="text-[10px] text-secondary-600 dark:text-secondary-400">
                  {new Date(hour.time).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                </p>
                <p className="mt-1 text-sm font-semibold text-crop-900 dark:text-white">
                  {hour.temperature}°
                </p>
                {hour.precipitation > 0 && (
                  <p className="mt-0.5 text-[10px] text-sky-600 dark:text-sky-400">
                    {hour.precipitation}%
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
