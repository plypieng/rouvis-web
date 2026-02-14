'use client';

import { useState, useEffect, useCallback } from 'react';

// Enhanced forecast types for weather intelligence API
export interface DetailedForecast {
  time: string;
  temperature: number;
  condition: string;
  icon: string;
  precipitation: number;
  windSpeed: number;
  windDirection?: string;
  humidity?: number;
}

export interface WeeklyForecast {
  date: string;
  temperature: {
    min: number;
    max: number;
  };
  condition: string;
  icon: string;
  precipitation: number;
  reliability?: string;
}

export interface NowcastEntry {
  time: string;
  precipitation: number;
  intensity: 'none' | 'light' | 'moderate' | 'heavy';
}

export interface WeatherWarning {
  id: string;
  type: string;
  severity: 'advisory' | 'warning' | 'emergency';
  title: string;
  description: string;
  issuedAt: string;
  areas: string[];
}

export interface TyphoonInfo {
  id: string;
  name: string;
  intensity: string;
  position: {
    lat: number;
    lon: number;
  };
  isApproaching: boolean;
  affectedAreas: string[];
}

// Legacy types for backward compatibility
export interface WeatherForecast {
  date: string;
  temperature: {
    min: number;
    max: number;
  };
  condition: string;
  icon: string;
  precipitation: number;
}

export interface WeatherData {
  temperature: number;
  humidity: number;
  windSpeed: number;
  windDirection?: string;
  condition: string;
  icon: string;
  forecast: WeatherForecast[];
  timestamp?: string;
}

interface UseWeatherForecastOptions {
  fieldId?: string;
  projectId?: string;
  refreshInterval?: number;
}

interface UseWeatherForecastReturn {
  current: Omit<WeatherData, 'forecast'> | null;
  forecast: WeatherForecast[];
  detailed: DetailedForecast[];
  weekly: WeeklyForecast[];
  nowcast: NowcastEntry[];
  warnings: WeatherWarning[];
  typhoons: TyphoonInfo[];
  loading: boolean;
  loadingDetailed: boolean;
  loadingWeekly: boolean;
  loadingNowcast: boolean;
  loadingWarnings: boolean;
  error: string | null;
  refetch: () => void;
}

function toWarningSeverity(severity: string): 'advisory' | 'warning' | 'emergency' {
  if (severity === 'high' || severity === 'emergency') return 'emergency';
  if (severity === 'medium' || severity === 'warning') return 'warning';
  return 'advisory';
}

export function useWeatherForecast(
  options: UseWeatherForecastOptions = {}
): UseWeatherForecastReturn {
  const { fieldId, projectId, refreshInterval } = options;

  const [current, setCurrent] = useState<Omit<WeatherData, 'forecast'> | null>(null);
  const [forecast, setForecast] = useState<WeatherForecast[]>([]);
  const [detailed, setDetailed] = useState<DetailedForecast[]>([]);
  const [weekly, setWeekly] = useState<WeeklyForecast[]>([]);
  const [nowcast, setNowcast] = useState<NowcastEntry[]>([]);
  const [warnings, setWarnings] = useState<WeatherWarning[]>([]);
  const [typhoons, setTyphoons] = useState<TyphoonInfo[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingDetailed, setLoadingDetailed] = useState(true);
  const [loadingWeekly, setLoadingWeekly] = useState(true);
  const [loadingNowcast, setLoadingNowcast] = useState(true);
  const [loadingWarnings, setLoadingWarnings] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWeather = useCallback(async () => {
    if (!fieldId && !projectId) {
      setError('天気情報の取得には projectId か fieldId が必要です');
      setLoading(false);
      setLoadingDetailed(false);
      setLoadingWeekly(false);
      setLoadingNowcast(false);
      setLoadingWarnings(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (fieldId) params.append('fieldId', fieldId);
      if (projectId) params.append('projectId', projectId);

      const queryString = params.toString();
      const url = `/api/weather/overview${queryString ? `?${queryString}` : ''}`;

      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error(`Weather API returned ${response.status}`);
      }

      const data: any = await response.json();
      const daily = Array.isArray(data.daily) ? data.daily : [];
      const alerts = Array.isArray(data.alerts) ? data.alerts : [];

      const mappedWeekly: WeeklyForecast[] = daily.map((day: any) => ({
        date: day.date,
        temperature: day.temperature,
        condition: day?.condition?.label || '不明',
        icon: day?.condition?.icon || '03d',
        precipitation: day?.precipitationMm ?? 0,
      }));

      setWeekly(mappedWeekly);
      setForecast(mappedWeekly.map((w) => ({
        date: w.date,
        temperature: w.temperature,
        condition: w.condition,
        icon: w.icon,
        precipitation: w.precipitation,
      })));

      if (data.current) {
        setCurrent({
          temperature: data.current.temperature,
          humidity: 0,
          windSpeed: data.current.windSpeedKmh ?? 0,
          windDirection: data.current.windDirectionLabel,
          condition: data?.current?.condition?.label || '不明',
          icon: data?.current?.condition?.icon || '03d',
          timestamp: data.current.observedAt,
        });
      } else {
        setCurrent(null);
      }

      setWarnings(alerts.map((alert: any) => ({
        id: alert.id,
        type: alert.type,
        severity: toWarningSeverity(alert.severity),
        title: alert.title,
        description: alert.description,
        issuedAt: alert.validFrom || new Date().toISOString(),
        areas: [alert.location || data?.location?.label || '不明'],
      })));

      setTyphoons(alerts
        .filter((alert: any) => alert.type === 'typhoon')
        .map((alert: any) => ({
          id: alert.id,
          name: alert.title,
          intensity: alert.severity,
          position: {
            lat: data?.location?.lat ?? 0,
            lon: data?.location?.lon ?? 0,
          },
          isApproaching: true,
          affectedAreas: [alert.location || data?.location?.label || '不明'],
        })));

      // These datasets are not yet provided by the backend weather intelligence v1.
      setDetailed([]);
      setNowcast([]);
    } catch (err) {
      console.error('Failed to fetch weather:', err);
      setError('天気情報の取得に失敗しました');
      setCurrent(null);
      setForecast([]);
      setDetailed([]);
      setWeekly([]);
      setNowcast([]);
      setWarnings([]);
      setTyphoons([]);
    } finally {
      setLoading(false);
      setLoadingDetailed(false);
      setLoadingWeekly(false);
      setLoadingNowcast(false);
      setLoadingWarnings(false);
    }
  }, [fieldId, projectId]);

  useEffect(() => {
    fetchWeather();
  }, [fetchWeather]);

  useEffect(() => {
    if (!refreshInterval || refreshInterval <= 0) {
      return;
    }

    const intervalId = setInterval(() => {
      fetchWeather();
    }, refreshInterval);

    return () => {
      clearInterval(intervalId);
    };
  }, [refreshInterval, fetchWeather]);

  return {
    current,
    forecast,
    detailed,
    weekly,
    nowcast,
    warnings,
    typhoons,
    loading,
    loadingDetailed,
    loadingWeekly,
    loadingNowcast,
    loadingWarnings,
    error,
    refetch: fetchWeather,
  };
}
