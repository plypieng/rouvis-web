'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';

type ForecastDay = {
  date: string;
  day: string;
  temperature: {
    min: number;
    max: number;
  };
  condition: string;
  icon: string;
  precipitation: number;
};

export function WeatherForecast() {
  const t = useTranslations();
  const [forecast, setForecast] = useState<ForecastDay[]>([]);
  const [loading, setLoading] = useState(true);

  // Localize English condition strings to JA using i18n keys; pass through JMA's JP text
  const localizeCondition = (cond: string): string => {
    const c = (cond || '').toLowerCase();
    if (c.includes('partly') && c.includes('cloud')) return t('weather.partly_cloudy');
    if (c.includes('sunny')) return t('weather.sunny');
    if (c.includes('heavy') && c.includes('rain')) return t('weather.heavy_rain');
    if (c.includes('rain')) return t('weather.rain');
    if (c.includes('cloud')) return t('weather.cloudy');
    return cond; // already localized (e.g., JMA: くもり/晴れ/雨)
  };

  useEffect(() => {
    const fetchWeatherForecast = async () => {
      try {
        const response = await fetch('/api/weather');
        const data = await response.json();

        // Transform API data to component format
        const transformedForecast: ForecastDay[] = data.forecast.map((day: any, index: number) => {
          const date = new Date(day.date);
          const dayNames = [t('weather.today'), t('weather.mon'), t('weather.tue'), t('weather.wed'), t('weather.thu'), t('weather.fri'), t('weather.sat'), t('weather.sun')];

          // Map weather icons from API to emoji
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

          return {
            date: day.date,
            day: dayNames[index] || date.toLocaleDateString('ja-JP', { weekday: 'short' }),
            temperature: day.temperature,
            condition: localizeCondition(day.condition),
            icon: iconMap[day.icon] || '☀️',
            precipitation: day.precipitation,
          };
        });

        setForecast(transformedForecast);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch weather forecast', error);
        setLoading(false);
      }
    };

    fetchWeatherForecast();
  }, [t]);

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 bg-gray-200 rounded"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center text-sm text-gray-600 pb-2 border-b">
        <span>{t('dashboard.location')}</span>
        <span>{t('dashboard.five_day_forecast')}</span>
      </div>
      
      <div className="space-y-3">
        {forecast.map((day) => (
          <div key={day.date} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
            <div className="w-16 text-sm font-medium">{day.day}</div>
            <div className="text-2xl">{day.icon}</div>
            <div className="flex-1 ml-2">
              <div className="text-sm font-medium">{day.condition}</div>
              <div className="text-xs text-gray-500">
                {day.precipitation > 0 
                  ? t('dashboard.rain_chance', { percentage: day.precipitation })
                  : t('dashboard.no_rain')}
              </div>
            </div>
            <div className="text-right">
              <span className="text-sm font-medium">{day.temperature.max}°</span>
              <span className="text-sm text-gray-500 ml-1">{day.temperature.min}°</span>
            </div>
          </div>
        ))}
      </div>
      
      <div className="pt-2 text-center">
        <button className="text-primary-600 text-sm font-medium hover:underline">
          {t('dashboard.view_detailed_forecast')}
        </button>
      </div>
    </div>
  );
}
