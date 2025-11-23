'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { AlertTriangle, CloudSnow, Wind, CloudRain } from 'lucide-react';

interface WeatherAlert {
  type: 'frost' | 'typhoon' | 'heavy_rain' | 'strong_wind' | 'snow';
  severity: 'high' | 'medium' | 'low';
  message: string;
  location: string;
  actionRequired?: string;
}

/**
 * Weather Alert Banner - Niigata-specific alerts
 *
 * Principles (FARMER_UX_VISION.md):
 * - Show critical warnings immediately (frost, typhoon)
 * - Natural language (not technical terms)
 * - Clear action required
 * - JP-first (JMA data)
 */
export function WeatherAlertBanner() {
  const t = useTranslations();
  const [alert, setAlert] = useState<WeatherAlert | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWeatherAlerts = async () => {
      try {
        const response = await fetch('/api/weather/alerts?area=niigata');

        if (!response.ok) {
          console.warn('Failed to fetch weather alerts');
          setLoading(false);
          return;
        }

        const data = await response.json();

        // Only show alerts with medium or high severity
        const criticalAlerts = data.alerts?.filter(
          (a: WeatherAlert) => a.severity === 'high' || a.severity === 'medium'
        );

        // Show the first critical alert (highest priority)
        if (criticalAlerts && criticalAlerts.length > 0) {
          setAlert(criticalAlerts[0]);
        }

        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch weather alerts', error);
        setLoading(false);
      }
    };

    fetchWeatherAlerts();

    // Refresh alerts every 30 minutes
    const interval = setInterval(fetchWeatherAlerts, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Don't render anything while loading or if no alerts
  if (loading || !alert) {
    return null;
  }

  const icons = {
    frost: CloudSnow,
    typhoon: Wind,
    heavy_rain: CloudRain,
    strong_wind: Wind,
    snow: CloudSnow,
  };

  const colors = {
    high: 'bg-red-500 border-red-600',
    medium: 'bg-yellow-500 border-yellow-600',
    low: 'bg-blue-500 border-blue-600',
  };

  const Icon = icons[alert.type];

  return (
    <div
      className={`${colors[alert.severity]} text-white rounded-lg border-2 p-4 animate-slideIn shadow-lg`}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <Icon className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4" />
            <span className="font-bold text-sm">
              {alert.type === 'frost' && '霜注意報'}
              {alert.type === 'typhoon' && '台風警報'}
              {alert.type === 'heavy_rain' && '大雨警報'}
              {alert.type === 'strong_wind' && '強風注意報'}
              {alert.type === 'snow' && '大雪警報'}
            </span>
            <span className="text-sm opacity-90">({alert.location})</span>
          </div>
          <p className="text-base font-medium mb-2">{alert.message}</p>
          {alert.actionRequired && (
            <p className="text-sm bg-white/20 rounded px-3 py-2 backdrop-blur-sm">
              💡 {alert.actionRequired}
            </p>
          )}
        </div>
        <button
          onClick={() => setAlert(null)}
          className="flex-shrink-0 p-1 hover:bg-white/20 rounded transition-colors"
          aria-label="アラートを閉じる"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
