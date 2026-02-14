'use client';

import { useState, useEffect, useCallback } from 'react';

export interface DailyWeather {
    date: string;
    temperature: {
        min: number;
        max: number;
    };
    condition: string;
    icon: string;
    precipitation: number;
}

interface MonthWeatherState {
    data: Record<string, DailyWeather>; // Date string (YYYY-MM-DD) -> Weather Data
    loading: boolean;
    error: string | null;
}

interface UseMonthWeatherOptions {
    fieldId?: string;
    projectId?: string;
}

export function useMonthWeather(year: number, month: number, options: UseMonthWeatherOptions = {}) {
    const [state, setState] = useState<MonthWeatherState>({
        data: {},
        loading: true,
        error: null
    });
    const { fieldId, projectId } = options;

    const fetchMonthWeather = useCallback(async () => {
        if (!fieldId && !projectId) {
            setState({
                data: {},
                loading: false,
                error: 'Weather scope is required',
            });
            return;
        }

        try {
            setState(prev => ({ ...prev, loading: true, error: null }));

            const params = new URLSearchParams({
                year: year.toString(),
                month: month.toString(),
            });
            if (fieldId) params.set('fieldId', fieldId);
            if (projectId) params.set('projectId', projectId);

            const res = await fetch(`/api/weather/forecast/monthly?${params.toString()}`);
            if (!res.ok) throw new Error('Failed to fetch weather');

            const json = await res.json();

            const dataMap: Record<string, DailyWeather> = {};
            const days = Array.isArray(json.daily) ? json.daily : Array.isArray(json.monthly) ? json.monthly : [];
            if (Array.isArray(days)) {
                days.forEach((day: any) => {
                    dataMap[day.date] = day;
                });
            }

            setState({
                data: dataMap,
                loading: false,
                error: null
            });
        } catch (error) {
            console.error('Failed to fetch monthly weather:', error);
            setState(prev => ({ ...prev, loading: false, error: 'Weather fetch failed' }));
        }
    }, [year, month, fieldId, projectId]);

    useEffect(() => {
        fetchMonthWeather();
    }, [fetchMonthWeather]);

    return state;
}
