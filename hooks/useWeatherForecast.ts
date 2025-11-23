'use client';

import { useState, useEffect, useCallback } from 'react';

// Enhanced forecast types for JMA API
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
  reliability?: string; // A, B, C
}

export interface NowcastEntry {
  time: string;
  precipitation: number;
  intensity: 'none' | 'light' | 'moderate' | 'heavy';
}

export interface WeatherWarning {
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
  lat?: number;
  lon?: number;
  refreshInterval?: number; // in milliseconds, default: no auto-refresh
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

/**
 * useWeatherForecast - Custom hook for fetching weather data
 *
 * Fetches 6-day forecast from /api/weather with optional field location.
 * Returns current weather and forecast array with loading/error states.
 *
 * Features:
 * - Optional fieldId parameter for field-specific weather
 * - Manual coordinates (lat/lon) override
 * - Caching with manual refetch capability
 * - Optional auto-refresh interval
 *
 * @example
 * ```tsx
 * const { current, forecast, loading, error, refetch } = useWeatherForecast({
 *   fieldId: 'field-123'
 * });
 * ```
 */
export function useWeatherForecast(
  options: UseWeatherForecastOptions = {}
): UseWeatherForecastReturn {
  const { fieldId, lat, lon, refreshInterval } = options;

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
    try {
      setLoading(true);
      setError(null);

      // Build query parameters
      const params = new URLSearchParams();
      params.append('type', 'all'); // Request all weather data
      if (fieldId) {
        params.append('fieldId', fieldId);
      }
      if (lat !== undefined) {
        params.append('lat', lat.toString());
      }
      if (lon !== undefined) {
        params.append('lon', lon.toString());
      }

      const queryString = params.toString();
      const url = `/api/weather${queryString ? `?${queryString}` : ''}`;

      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
        },
        // Add cache control for fresh data
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error(`Weather API returned ${response.status}`);
      }

      const data: any = await response.json();

      // Parse detailed forecast (3-day hourly)
      if (data.detailed) {
        setLoadingDetailed(true);
        setDetailed(data.detailed || []);
        setLoadingDetailed(false);
      }

      // Parse weekly forecast (7-day)
      if (data.weekly) {
        setLoadingWeekly(true);
        setWeekly(data.weekly || []);
        setLoadingWeekly(false);
      }

      // Parse nowcast (1-hour precipitation)
      if (data.nowcast) {
        setLoadingNowcast(true);
        setNowcast(data.nowcast || []);
        setLoadingNowcast(false);
      }

      // Parse warnings
      if (data.warnings) {
        setLoadingWarnings(true);
        setWarnings(data.warnings || []);
        setLoadingWarnings(false);
      }

      // Parse typhoons
      if (data.typhoons) {
        setTyphoons(data.typhoons || []);
      }

      // Set current weather from detailed forecast (first entry)
      if (data.detailed && data.detailed.length > 0) {
        const firstEntry = data.detailed[0];
        setCurrent({
          temperature: firstEntry.temperature,
          humidity: firstEntry.humidity || 65,
          windSpeed: firstEntry.windSpeed,
          windDirection: firstEntry.windDirection,
          condition: firstEntry.condition,
          icon: firstEntry.icon,
          timestamp: firstEntry.time,
        });
      } else if (data.temperature !== undefined) {
        // Fallback to legacy format
        setCurrent({
          temperature: data.temperature,
          humidity: data.humidity,
          windSpeed: data.windSpeed,
          windDirection: data.windDirection,
          condition: data.condition,
          icon: data.icon,
          timestamp: data.timestamp,
        });
      }

      // Convert weekly to legacy forecast format for backward compatibility
      if (data.weekly) {
        setForecast(data.weekly.map((w: WeeklyForecast) => ({
          date: w.date,
          temperature: w.temperature,
          condition: w.condition,
          icon: w.icon,
          precipitation: w.precipitation,
        })));
      } else {
        setForecast(data.forecast || []);
      }
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
  }, [fieldId, lat, lon]);

  // Initial fetch
  useEffect(() => {
    fetchWeather();
  }, [fetchWeather]);

  // Auto-refresh if interval is specified
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
