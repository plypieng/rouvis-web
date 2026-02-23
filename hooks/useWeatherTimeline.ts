'use client';

import { useEffect, useState } from 'react';
import {
  clampPrecipProbability,
  precipitationMmToProbability,
  type WeatherTimelineDayData,
} from '@/lib/weather-timeline';

interface UseWeatherTimelineOptions {
  fieldId?: string;
  projectId?: string;
  disabled?: boolean;
}

interface WeatherTimelineState {
  data: Record<string, WeatherTimelineDayData>;
  loading: boolean;
  error: string | null;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object') return value as Record<string, unknown>;
  return {};
}

function asNumber(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function asDateString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function extractConditionLabel(day: Record<string, unknown>): string {
  const rawCondition = day.condition;
  if (typeof rawCondition === 'string') return rawCondition;
  if (rawCondition && typeof rawCondition === 'object') {
    const label = asRecord(rawCondition).label;
    if (typeof label === 'string' && label.trim()) return label;
  }
  return 'Unknown';
}

function extractConditionCode(day: Record<string, unknown>): number | undefined {
  const weatherCode = asNumber(day.weatherCode);
  if (typeof weatherCode === 'number') return weatherCode;

  const rawCondition = day.condition;
  if (rawCondition && typeof rawCondition === 'object') {
    const code = asNumber(asRecord(rawCondition).code);
    if (typeof code === 'number') return code;
  }

  return undefined;
}

function extractConditionIcon(day: Record<string, unknown>): string | undefined {
  const directIcon = day.icon;
  if (typeof directIcon === 'string' && directIcon.trim()) return directIcon;

  const rawCondition = day.condition;
  if (rawCondition && typeof rawCondition === 'object') {
    const icon = asRecord(rawCondition).icon;
    if (typeof icon === 'string' && icon.trim()) return icon;
  }

  return undefined;
}

function extractPrecipProbability(day: Record<string, unknown>): number {
  const direct =
    asNumber(day.precipProbability)
    ?? asNumber(day.precipitationProbability)
    ?? asNumber(day.precipitationChance)
    ?? asNumber(day.pop)
    ?? asNumber(day.precipitation_percent);
  if (typeof direct === 'number') {
    return clampPrecipProbability(direct);
  }

  const precipitationMm =
    asNumber(day.precipitationMm)
    ?? asNumber(day.precipitation)
    ?? asNumber(day.precipitation_sum)
    ?? asNumber(day.rain);

  return clampPrecipProbability(precipitationMmToProbability(precipitationMm ?? 0));
}

function extractTemperature(day: Record<string, unknown>): WeatherTimelineDayData['temperature'] {
  const rawTemperature = day.temperature;
  if (rawTemperature && typeof rawTemperature === 'object') {
    const mapped = asRecord(rawTemperature);
    const min = asNumber(mapped.min);
    const max = asNumber(mapped.max);
    if (typeof min === 'number' && typeof max === 'number') {
      return { min, max };
    }
  }

  const min = asNumber(day.temperatureMin) ?? asNumber(day.tempMin);
  const max = asNumber(day.temperatureMax) ?? asNumber(day.tempMax);
  if (typeof min === 'number' && typeof max === 'number') {
    return { min, max };
  }

  return undefined;
}

function toDailyTimeline(day: Record<string, unknown>): WeatherTimelineDayData | null {
  const date = asDateString(day.date);
  if (!date) return null;

  return {
    precipProbability: extractPrecipProbability(day),
    condition: extractConditionLabel(day),
    weatherCode: extractConditionCode(day),
    icon: extractConditionIcon(day),
    temperature: extractTemperature(day),
  };
}

export function useWeatherTimeline(
  locationLat?: number,
  locationLon?: number,
  startDate?: string,
  endDate?: string,
  options: UseWeatherTimelineOptions = {},
): WeatherTimelineState {
  const [state, setState] = useState<WeatherTimelineState>({
    data: {},
    loading: false,
    error: null,
  });

  const { fieldId, projectId, disabled = false } = options;

  useEffect(() => {
    if (!startDate || !endDate || disabled) {
      setState({
        data: {},
        loading: false,
        error: null,
      });
      return;
    }

    const controller = new AbortController();
    let active = true;
    setState((prev) => ({ ...prev, loading: true, error: null }));

    const run = async () => {
      try {
        const params = new URLSearchParams({
          startDate,
          endDate,
        });

        if (typeof locationLat === 'number' && Number.isFinite(locationLat)) {
          params.set('lat', String(locationLat));
        }
        if (typeof locationLon === 'number' && Number.isFinite(locationLon)) {
          params.set('lon', String(locationLon));
        }
        if (fieldId) params.set('fieldId', fieldId);
        if (projectId) params.set('projectId', projectId);

        const response = await fetch(`/api/weather/forecast/daily?${params.toString()}`, {
          signal: controller.signal,
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error('Failed to fetch weather timeline');
        }

        const json = await response.json() as { daily?: unknown };
        const days = Array.isArray(json.daily) ? json.daily : [];
        const mapped: Record<string, WeatherTimelineDayData> = {};

        for (const raw of days) {
          const day = asRecord(raw);
          const date = asDateString(day.date);
          if (!date) continue;

          const normalized = toDailyTimeline(day);
          if (!normalized) continue;

          mapped[date] = normalized;
        }

        if (!active) return;
        setState({
          data: mapped,
          loading: false,
          error: null,
        });
      } catch (error) {
        if (!active || controller.signal.aborted) return;
        console.error('Failed to fetch weather timeline:', error);
        setState({
          data: {},
          loading: false,
          error: 'Weather timeline fetch failed',
        });
      }
    };

    void run();

    return () => {
      active = false;
      controller.abort();
    };
  }, [disabled, endDate, fieldId, locationLat, locationLon, projectId, startDate]);

  return state;
}
