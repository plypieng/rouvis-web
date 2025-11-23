'use client';

import { useTranslations } from 'next-intl';

interface DayForecast {
  date: string;
  dayOfWeek: string; // 月火水木金土日
  icon: string;
  highTemp: number;
  lowTemp: number;
  condition?: string;
  precipitation?: number;
}

interface SixDayWeatherGridProps {
  forecast: DayForecast[];
}

/**
 * SixDayWeatherGrid - 6-day forecast grid for weather planning
 *
 * Displays a horizontal grid of 6 days with:
 * - Day abbreviation (月火水木金土日)
 * - Weather icon (Material Symbols or emoji)
 * - High/low temps (33°/24° format)
 *
 * Design per MVPA_UI_CONTEXT.md section 6:
 * - Horizontal layout with borders between cells
 * - Responsive: horizontal scroll on mobile
 * - Material Symbols icons or emoji for weather
 */
export function SixDayWeatherGrid({ forecast }: SixDayWeatherGridProps) {
  const t = useTranslations();

  // Map weather icons from API to emoji
  const getWeatherIcon = (iconCode: string): string => {
    const iconMap: Record<string, string> = {
      '01d': '☀️', // clear sky day
      '01n': '☀️', // clear sky night (show sunny for forecast)
      '02d': '⛅', // few clouds day
      '02n': '⛅', // few clouds night
      '03d': '⛅', // scattered clouds
      '03n': '⛅',
      '04d': '☁️', // broken clouds
      '04n': '☁️',
      '09d': '🌧️', // shower rain
      '09n': '🌧️',
      '10d': '🌦️', // rain day
      '10n': '🌦️', // rain night
      '11d': '⛈️', // thunderstorm
      '11n': '⛈️',
      '13d': '❄️', // snow
      '13n': '❄️',
      '50d': '🌫️', // mist
      '50n': '🌫️'
    };

    return iconMap[iconCode] || '☀️';
  };

  // Get Japanese day abbreviation
  const getDayAbbreviation = (dateString: string): string => {
    const date = new Date(dateString);
    const dayIndex = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    return days[dayIndex];
  };

  // Determine if this is today
  const isToday = (dateString: string): boolean => {
    const today = new Date();
    const date = new Date(dateString);
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  return (
    <div className="rounded-lg bg-white shadow-sm dark:bg-background/50">
      {/* Header */}
      <div className="border-b border-secondary-200 px-4 py-3 dark:border-secondary-700">
        <h3 className="text-sm font-bold text-crop-900 dark:text-white">
          {t('vibe.weather_work_plan')}
        </h3>
      </div>

      {/* 6-day grid */}
      <div className="overflow-x-auto">
        <div className="flex min-w-max">
          {forecast.slice(0, 6).map((day, index) => {
            const dayAbbr = day.dayOfWeek || getDayAbbreviation(day.date);
            const isTodayCell = isToday(day.date);

            return (
              <div
                key={day.date}
                className={`flex flex-1 flex-col items-center gap-1 p-3 text-center ${
                  index < 5 ? 'border-r border-secondary-300 dark:border-secondary-700' : ''
                } ${
                  isTodayCell
                    ? 'bg-crop-50/50 dark:bg-crop-900/10'
                    : 'hover:bg-secondary-50 dark:hover:bg-background/30'
                }`}
                style={{ minWidth: '80px' }}
              >
                {/* Day of week */}
                <span
                  className={`text-sm font-bold ${
                    isTodayCell
                      ? 'text-crop-700 dark:text-crop-400'
                      : 'text-crop-900 dark:text-white'
                  }`}
                >
                  {dayAbbr}
                </span>

                {/* Weather icon */}
                <div
                  className="my-1 text-3xl"
                  role="img"
                  aria-label={day.condition || 'weather'}
                >
                  {getWeatherIcon(day.icon)}
                </div>

                {/* Temperature range */}
                <div className="flex items-baseline gap-1">
                  <span className="text-sm font-bold text-crop-900 dark:text-white">
                    {day.highTemp}°
                  </span>
                  <span className="text-xs text-secondary-600 dark:text-secondary-400">
                    {day.lowTemp}°
                  </span>
                </div>

                {/* Precipitation indicator (optional) */}
                {day.precipitation !== undefined && day.precipitation > 30 && (
                  <div className="mt-1 flex items-center gap-0.5 text-[10px] text-sky-600 dark:text-sky-400">
                    <span className="material-symbols-outlined !text-xs">
                      umbrella
                    </span>
                    <span>{day.precipitation}%</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile scroll hint */}
      <div className="border-t border-secondary-200 px-4 py-2 text-center dark:border-secondary-700 md:hidden">
        <p className="text-xs text-secondary-600 dark:text-secondary-400">
          ← スワイプして6日間の天気を確認 →
        </p>
      </div>
    </div>
  );
}
